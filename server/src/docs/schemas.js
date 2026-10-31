export const swaggerSchemas = {
  schemas: {
    RegisterRequest: {
      type: 'object',
      required: ['fullName', 'email', 'phone', 'password', 'confirmPassword'],
      properties: {
        fullName: { type: 'string', example: 'Aarav Sharma' },
        email: { type: 'string', format: 'email', example: 'aarav@example.com' },
        phone: { type: 'string', example: '+919876543210' },
        password: { type: 'string', example: 'StrongPass123!' },
        confirmPassword: { type: 'string', example: 'StrongPass123!' },
      },
    },
    LoginRequest: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'aarav@example.com' },
        password: { type: 'string', example: 'StrongPass123!' },
      },
    },
    ProfileUpdateRequest: {
      type: 'object',
      properties: {
        fullName: { type: 'string', example: 'Aarav Sharma' },
        email: { type: 'string', format: 'email', example: 'aarav@example.com' },
        phone: { type: 'string', example: '+919876543210' },
        avatar: { type: 'string', format: 'uri', example: 'https://example.com/avatar.png' },
      },
    },
    ChangePasswordRequest: {
      type: 'object',
      required: ['currentPassword', 'newPassword', 'confirmPassword'],
      properties: {
        currentPassword: { type: 'string', example: 'OldPass123!' },
        newPassword: { type: 'string', example: 'NewPass123!' },
        confirmPassword: { type: 'string', example: 'NewPass123!' },
      },
    },
    ForgotPasswordRequest: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email', example: 'aarav@example.com' },
      },
    },
    ResetPasswordRequest: {
      type: 'object',
      required: ['password', 'confirmPassword'],
      properties: {
        password: { type: 'string', example: 'NewPass123!' },
        confirmPassword: { type: 'string', example: 'NewPass123!' },
      },
    },
    CreateComplaintRequest: {
      type: 'object',
      required: ['category', 'title', 'description', 'location'],
      properties: {
        category: { type: 'string', example: '507f1f77bcf86cd799439011' },
        title: { type: 'string', example: 'Broken streetlight near park' },
        description: { type: 'string', example: 'The streetlight near the main park entrance has been broken for over a week.' },
        location: {
          oneOf: [
            { type: 'string', example: 'Main Park Road, Sector 7' },
            {
              type: 'object',
              required: ['address'],
              properties: {
                address: { type: 'string', example: 'Main Park Road, Sector 7' },
                coordinates: {
                  type: 'object',
                  required: ['lat', 'lng'],
                  properties: {
                    lat: { type: 'number', example: 28.6139 },
                    lng: { type: 'number', example: 77.209 },
                  },
                },
              },
            },
          ],
        },
        latitude: { type: 'number', example: 28.6139 },
        longitude: { type: 'number', example: 77.2090 },
        priority: { type: 'string', example: 'high' },
        images: {
          type: 'array',
          maxItems: 4,
          items: {
            type: 'object',
            required: ['url'],
            properties: {
              url: { type: 'string', format: 'uri' },
              publicId: { type: 'string' },
            },
          },
        },
      },
    },
    UpdateComplaintRequest: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Broken streetlight near park' },
        description: { type: 'string', example: 'The streetlight near the main park entrance has been broken for over a week.' },
        location: {
          oneOf: [
            { type: 'string', example: 'Main Park Road, Sector 7' },
            {
              type: 'object',
              required: ['address'],
              properties: {
                address: { type: 'string', example: 'Main Park Road, Sector 7' },
                coordinates: {
                  type: 'object',
                  required: ['lat', 'lng'],
                  properties: {
                    lat: { type: 'number', example: 28.6139 },
                    lng: { type: 'number', example: 77.209 },
                  },
                },
              },
            },
          ],
        },
        priority: { type: 'string', example: 'high' },
      },
    },
    ComplaintStatusHistoryEntry: {
      type: 'object',
      required: ['status', 'changedBy', 'changedAt'],
      properties: {
        status: { type: 'string', enum: ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'closed'] },
        note: { type: 'string', maxLength: 1000 },
        changedBy: { type: 'string', format: 'objectId' },
        changedAt: { type: 'string', format: 'date-time' },
      },
    },
    ErrorResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        statusCode: { type: 'integer', example: 422 },
        message: { type: 'string', example: 'Validation failed' },
        errors: { type: 'array', items: { type: 'string' }, example: ['title is required'] },
      },
    },
  },
};
