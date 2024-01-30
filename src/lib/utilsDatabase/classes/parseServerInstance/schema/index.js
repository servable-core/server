import mongoose from 'mongoose'
const { Schema } = mongoose

export default new Schema({
    state: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    key: String,
    lastPing: Date
})