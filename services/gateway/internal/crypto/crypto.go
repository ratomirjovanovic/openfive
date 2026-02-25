package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"encoding/base64"
	"errors"

	"golang.org/x/crypto/pbkdf2"
)

const (
	ivLength   = 12 // AES-GCM standard nonce size
	keyLength  = 32 // AES-256
	iterations = 100000
)

var salt = []byte("openfive-v1")

// Decrypt decrypts a base64-encoded AES-256-GCM ciphertext
// encrypted by the Node.js encrypt() function.
func Decrypt(encoded string, masterKey string) (string, error) {
	if len(masterKey) < 32 {
		return "", errors.New("master key must be at least 32 characters")
	}

	// Derive key using PBKDF2 (same as Node.js side)
	dk := pbkdf2.Key([]byte(masterKey[:32]), salt, iterations, keyLength, sha256.New)

	// Decode base64
	combined, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", errors.New("invalid base64 encoding")
	}

	if len(combined) < ivLength {
		return "", errors.New("ciphertext too short")
	}

	iv := combined[:ivLength]
	ciphertext := combined[ivLength:]

	// Create AES-GCM cipher
	block, err := aes.NewCipher(dk)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Decrypt
	plaintext, err := gcm.Open(nil, iv, ciphertext, nil)
	if err != nil {
		return "", errors.New("decryption failed - wrong key or corrupted data")
	}

	return string(plaintext), nil
}
