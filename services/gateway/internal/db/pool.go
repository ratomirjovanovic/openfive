package db

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Pool wraps pgxpool for database connections.
type Pool struct {
	pool *pgxpool.Pool
}

// NewPool creates a new connection pool.
func NewPool(ctx context.Context, databaseURL string) (*Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse db config: %w", err)
	}

	config.MaxConns = 20
	config.MinConns = 5

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}

	log.Println("database connection pool established")
	return &Pool{pool: pool}, nil
}

// Close shuts down the connection pool.
func (p *Pool) Close() {
	p.pool.Close()
}

// Inner returns the underlying pgxpool for direct queries.
func (p *Pool) Inner() *pgxpool.Pool {
	return p.pool
}
