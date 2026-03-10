async function test() {
  console.log('Fetching Edge Function (Minimal Test)...');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch('https://laliiuqjpxanhwhxajlm.supabase.co/functions/v1/batch-send-notifications', { 
      method: 'POST',
      body: JSON.stringify({}),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('Error: Connection timed out (10s)');
    } else {
      console.error('Error:', err.message);
    }
  }
}

test();
