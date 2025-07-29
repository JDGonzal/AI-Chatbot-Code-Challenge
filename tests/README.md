# AI Chatbot Code Challenge - Test Suite

This test suite provides comprehensive coverage for the AI Chatbot application, including unit tests, integration tests, and end-to-end testing scenarios.

## Test Structure

### 📁 Test Organization
```
tests/
├── setup.js                           # Test environment configuration
├── controllers/
│   ├── auth.controller.test.js        # Authentication controller tests
│   └── chat.controller.test.js        # Chat controller tests
├── middleware/
│   └── auth.test.js                   # Authentication middleware tests
├── services/
│   └── services.test.js               # Service layer tests (scraper, embedding, etc.)
└── routes/
    └── routes.test.js                 # Integration tests for API routes
```

## 🧪 Test Coverage

### Authentication Flow Tests
- ✅ User registration (positive & negative cases)
- ✅ User login (positive & negative cases)
- ✅ JWT token validation
- ✅ Password hashing and validation
- ✅ Username length validation
- ✅ Duplicate user prevention

### Chat Functionality Tests
- ✅ Access control with authentication middleware
- ✅ Finance chat processing with mocked LLM services
- ✅ Unknown product query handling
- ✅ Service error handling (scraper, embeddings, Pinecone)
- ✅ Complete chat workflow integration

### Service Layer Tests
- ✅ Web scraper with mocked HTTP requests
- ✅ Text chunking functionality
- ✅ OpenAI embedding service (mocked)
- ✅ Pinecone vector database operations (mocked)
- ✅ Error handling for external service failures

### API Route Integration Tests
- ✅ Complete HTTP request/response cycles
- ✅ Authentication middleware integration
- ✅ Missing auth header scenarios
- ✅ Invalid token handling
- ✅ Cross-route authentication flow

## 🚀 Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

### Run Specific Test Files
```bash
# Run only authentication tests
npx jest tests/controllers/auth.controller.test.js

# Run only route integration tests
npx jest tests/routes/routes.test.js
```

## 📊 Coverage Requirements

The test suite maintains the following coverage thresholds:
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

## 🔧 Test Configuration

### Mocked Services
All external services are mocked to ensure:
- ⚡ Fast test execution
- 🔒 No external API calls during testing
- 📈 Consistent test results
- 💰 No API costs during development

**Mocked Services Include:**
- OpenAI Embeddings API
- Pinecone Vector Database
- Web scraping (axios/cheerio)
- Password hashing (bcrypt)
- JWT token operations

### Environment Variables
Test environment automatically sets:
```bash
NODE_ENV=test
AUTH_SEED=test-auth-seed-for-jwt
OPENAI_API_KEY=test-openai-key
PINECONE_API_KEY=test-pinecone-key
```

## 🧪 Test Scenarios Covered

### Positive Test Cases
- ✅ Successful user registration and login
- ✅ Valid authentication token processing
- ✅ Successful finance chat queries
- ✅ Proper service integration flow

### Negative Test Cases
- ❌ Invalid login credentials
- ❌ Missing authentication headers
- ❌ Expired or malformed JWT tokens
- ❌ Unknown product queries
- ❌ External service failures
- ❌ Malformed request data

### Edge Cases
- 🔄 Service timeout scenarios
- 🔄 Empty search results
- 🔄 Concurrent user operations
- 🔄 Large data processing

## 🐛 Debugging Tests

### View Detailed Test Output
```bash
npm test -- --verbose
```

### Run Tests with Debug Information
```bash
DEBUG=* npm test
```

### Test Individual Components
```bash
# Test only authentication
npm test -- --testPathPattern=auth

# Test only services
npm test -- --testPathPattern=services
```

## 📝 Writing New Tests

When adding new features, ensure tests cover:

1. **Happy Path**: Normal operation scenarios
2. **Error Handling**: All error conditions
3. **Edge Cases**: Boundary conditions
4. **Integration**: How components work together
5. **Security**: Authentication and authorization

### Test Naming Convention
- Use descriptive test names: `should register user successfully with valid credentials`
- Group related tests with `describe` blocks
- Use `beforeEach` for test setup
- Mock external dependencies consistently

## 🔍 Continuous Integration

Tests are designed to run in CI/CD environments with:
- No external service dependencies
- Consistent execution time
- Clear failure reporting
- Coverage reporting integration 