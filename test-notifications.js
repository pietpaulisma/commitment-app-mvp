#!/usr/bin/env node

// Test script to verify notification API
const fetch = require('node-fetch')

async function testNotificationAPI() {
  const API_URL = 'https://commitment-app-e1lkovt6v-pietpaulismas-projects.vercel.app'
  
  console.log('🧪 Testing notification API...')
  console.log(`API URL: ${API_URL}`)
  
  try {
    // Test API endpoint exists
    console.log('\n1. Testing API endpoint availability...')
    const response = await fetch(`${API_URL}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userIds: ['test-user-id'],
        title: 'Test Notification',
        body: 'This is a test notification',
        data: { type: 'test' }
      })
    })
    
    console.log(`Response status: ${response.status}`)
    const result = await response.text()
    console.log(`Response body: ${result}`)
    
    if (response.status === 500 && result.includes('Push notifications not configured')) {
      console.log('❌ VAPID keys not found - this is expected in dev environment without proper linking')
    } else if (response.status === 400) {
      console.log('✅ API is responding correctly (400 is expected for invalid user IDs)')
    } else {
      console.log(`✅ API responded with status ${response.status}`)
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message)
  }
  
  console.log('\n🧪 Test completed!')
  console.log('\nTo fully test notifications:')
  console.log('1. Open the app in a browser: ' + API_URL)
  console.log('2. Login and go to Profile')
  console.log('3. Open notification settings and enable notifications')
  console.log('4. Go to Bot Message Settings (admin panel)')
  console.log('5. Click "🧪 Send Test Notification" button')
}

testNotificationAPI()