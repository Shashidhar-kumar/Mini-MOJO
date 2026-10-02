const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        company: {
            type: String,
            required: true,
            trim: true
        },

        location: {
            type: String,
            trim: true,
            default: ''
        },

        description: {
            type: String,
            trim: true,
            default: ''
        },

        status: {
            type: String,
            enum: ['Open', 'Closed'],
            default: 'Open'
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    'Job',
    jobSchema
);