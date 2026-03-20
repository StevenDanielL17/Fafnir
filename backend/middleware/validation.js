/**
 * INPUT VALIDATION SCHEMAS
 * 
 * Joi schemas for validating all incoming requests.
 * Prevents injection attacks and bad data from reaching business logic.
 */

const Joi = require('joi');

// ── AUTH SCHEMAS ────────────────────────────────────────

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
}).unknown(false); // Reject unknown fields

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
}).unknown(false);

// ── GOAL SCHEMAS ────────────────────────────────────────

const createGoalSchema = Joi.object({
  goalText: Joi.string().min(10).max(500).required(),
  description: Joi.string().max(1000).optional(),
}).unknown(false);

const updateGoalSchema = Joi.object({
  goalText: Joi.string().min(10).max(500).optional(),
  description: Joi.string().max(1000).optional(),
  status: Joi.string().valid('active', 'paused', 'completed').optional(),
}).unknown(false);

// ── CHAT SCHEMAS ────────────────────────────────────────

const chatSchema = Joi.object({
  message: Joi.string().min(1).max(5000).required(),
  conversationId: Joi.string().uuid().optional(),
  history: Joi.array()
    .items(
      Joi.object({
        role: Joi.string().valid('user', 'assistant').required(),
        content: Joi.string().min(1).max(5000).required(),
      }).unknown(false)
    )
    .max(50)
    .optional(),
}).unknown(false);

// ── VALIDATION MIDDLEWARE ───────────────────────────────

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: messages,
      });
    }

    // Replace req.body with validated value
    req.body = value;
    next();
  };
};

module.exports = {
  validate,
  // Export individual schemas for reuse
  signupSchema,
  loginSchema,
  createGoalSchema,
  updateGoalSchema,
  chatSchema,
};
