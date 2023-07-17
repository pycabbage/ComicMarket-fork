module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV !== 'development' ? { cssnano: {} } : {})
  },
}
