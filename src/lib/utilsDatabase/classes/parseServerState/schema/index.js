import mongoose from 'mongoose'
const { Schema } = mongoose

export default new Schema({
  // version: { type: Number, default: 0 },
  migrationsAttempts: { type: Number, default: 0 },
  migrationState: { type: Number, default: 0 },
  validationState: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  lastMigrationStartedAt: Date,
  lastMigrationEndedAt: Date,
  migrationFailureError: String,
  // appConfig: String,
  // appConfigTarget: String,
  protocols: String,
  protocolsTarget: String,
  key: String,
})
