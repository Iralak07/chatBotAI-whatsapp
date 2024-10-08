const PostgreSQLAdapter = require('@bot-whatsapp/database/postgres')

const POSTGRES_DB_HOST = 'localhost'
const POSTGRES_DB_USER = 'postgres'
const POSTGRES_DB_PASSWORD = '3919305001'
const POSTGRES_DB_NAME = 'chatbotia'
const POSTGRES_DB_PORT = '5432'

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