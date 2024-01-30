import mongoose from 'mongoose'
const { Schema } = mongoose

export default new Schema({
    state: { type: Number, default: 0 },
    version: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    lastOperationStartedAt: Date,
    lastOperationEndedAt: Date,
    migrationFailureError: String,
    entityId: String,
    type: String,
    mode: String,
    dataSHA: String,
    dataCount: { type: Number, default: 0 },
})