const btn = document.getElementById('loginBtn');
const input = document.getElementById('password');
const error = document.getElementById('error');

function resetButton() {
  btn.disabled = false;
  btn.textContent = 'Connect Securely';
}

async function doLogin() {
  const password = input.value;
  if (!password) return;

  btn.disabled = true;
  btn.textContent = 'Verifying...';
  error.textContent = 'Invalid password. Please try again.';
  error.style.display = 'none';

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      window.location.href = '/';
      return;
    }

    error.style.display = 'block';
    resetButton();
  } catch (_) {
    error.textContent = 'Connection failed. Is the server running?';
    error.style.display = 'block';
    resetButton();
  }
}

btn.addEventListener('click', doLogin);
input.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    doLogin();
  }
});
