var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/todo-list';

module.exports = connectionString;
