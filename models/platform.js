const mongoose = require('mongoose');

const platformSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        costModel: {
            type: String,
            enum: ['CPC', 'CPA', 'Flat'],
            default: 'CPC'
        },

        simulatedCPA: {
            type: Number,
            default: 25,
            min: 0.01
        },

        qualityRate: {
            type: Number,
            default: 0.3,
            min: 0,
            max: 1
        },

        active: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    'Platform',
    platformSchema
);