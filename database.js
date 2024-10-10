const PostgreSQLAdapter = require('@bot-whatsapp/database/postgres')

const POSTGRES_DB_HOST = 'autorack.proxy.rlwy.net'
const POSTGRES_DB_USER = 'postgres'
const POSTGRES_DB_PASSWORD = 'BRzQVziCRJfMactzFzWcTcAVDiWYUJhq'
const POSTGRES_DB_NAME = 'railway'
const POSTGRES_DB_PORT = '17982'

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