// Test script to validate Zod generation works correctly
import { UserSchema, PostSchema, validateUser, safeParsePost } from './src/api/types.zod';

// Test 1: Valid user data
const validUser = {
  id: 1,
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  is_active: true,
  created_at: '2025-08-17T12:00:00Z',
  updated_at: '2025-08-17T12:00:00Z'
};

console.log('Testing valid user:');
try {
  const user = validateUser(validUser);
  console.log('✓ Valid user passed validation:', user);
} catch (error) {
  console.error('✗ Valid user failed:', error);
}

// Test 2: Invalid user data (missing required field)
const invalidUser = {
  id: 2,
  // missing email
  first_name: 'Jane',
  last_name: 'Smith',
  created_at: '2025-08-17T12:00:00Z',
  updated_at: '2025-08-17T12:00:00Z'
};

console.log('\nTesting invalid user (missing email):');
try {
  validateUser(invalidUser);
  console.log('✗ Invalid user should have failed but passed');
} catch (error: any) {
  console.log('✓ Invalid user correctly failed:', error.errors[0]);
}

// Test 3: Invalid email format
const invalidEmailUser = {
  id: 3,
  email: 'not-an-email',
  first_name: 'Bob',
  last_name: 'Johnson',
  created_at: '2025-08-17T12:00:00Z',
  updated_at: '2025-08-17T12:00:00Z'
};

console.log('\nTesting invalid email format:');
const emailResult = UserSchema.safeParse(invalidEmailUser);
if (!emailResult.success) {
  console.log('✓ Invalid email correctly rejected:', emailResult.error.errors[0]);
} else {
  console.log('✗ Invalid email should have been rejected');
}

// Test 4: Valid post with safeParse
const validPost = {
  id: 1,
  title: 'Test Post',
  content: 'This is a test post content',
  author: 1,
  author_name: 'John Doe',
  published: true,
  created_at: '2025-08-17T12:00:00Z',
  updated_at: '2025-08-17T12:00:00Z'
};

console.log('\nTesting valid post with safeParse:');
const postResult = safeParsePost(validPost);
if (postResult.success) {
  console.log('✓ Valid post passed:', postResult.data);
} else {
  console.log('✗ Valid post failed:', postResult.error);
}

// Test 5: String length validation
const tooLongTitle = {
  id: 2,
  title: 'a'.repeat(201), // Exceeds max length of 200
  content: 'Content',
  author: 1,
  author_name: 'John Doe',
  created_at: '2025-08-17T12:00:00Z',
  updated_at: '2025-08-17T12:00:00Z'
};

console.log('\nTesting string length validation:');
const titleResult = PostSchema.safeParse(tooLongTitle);
if (!titleResult.success) {
  console.log('✓ Too long title correctly rejected:', titleResult.error.errors[0]);
} else {
  console.log('✗ Too long title should have been rejected');
}

console.log('\n✅ All Zod validation tests completed!');