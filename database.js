const PostgreSQLAdapter = require('@bot-whatsapp/database/postgres')

const POSTGRES_DB_HOST = ''
const POSTGRES_DB_USER = ''
const POSTGRES_DB_PASSWORD = ''
const POSTGRES_DB_NAME = ''
const POSTGRES_DB_PORT = ''

const adapterDB = new PostgreSQLAdapter({
    host: POSTGRES_DB_HOST,
    user: POSTGRES_DB_USER,
    database: POSTGRES_DB_NAME,
    password: POSTGRES_DB_PASSWORD,
    port: POSTGRES_DB_PORT,
})


module.exports = {
    adapterDB
}
