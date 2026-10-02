const mongoose = require('mongoose');

const publisherSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    platform: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Platform'
    },

    allocated: {
        type: Number,
        required: true,
        min: 0
    },

    spent: {
        type: Number,
        required: true,
        min: 0
    },

    apps: {
        type: Number,
        required: true,
        min: 0
    },

    qualifiedApps: {
        type: Number,
        default: 0,
        min: 0
    },

    cpa: {
        type: Number,
        default: 0
    }
});

const historySchema = new mongoose.Schema({
    at: {
        type: Date,
        default: Date.now
    },

    message: {
        type: String,
        required: true
    },

    moved: {
        type: Number,
        default: 0
    }
});

const campaignSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },

        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job',
            required: true
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        totalBudget: {
            type: Number,
            required: true
        },

        status: {
            type: String,
            enum: [
                'Active',
                'Optimized',
                'Paused',
                'Completed'
            ],
            default: 'Active'
        },

        publishers: [publisherSchema],

        history: [historySchema]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    'Campaign',
    campaignSchema
);