const USERS_KEY = "careerPilotUsers";
const SESSION_KEY = "careerPilotSession";
const PENDING_EMAIL_KEY = "careerPilotPendingEmail";
const PASSWORD_ITERATIONS = 120000;

function showMessage(element, message, type = "error") {
  if (!element) return;

  element.textContent = message;
  element.className = `form-message ${type}`;
}

function clearMessage(element) {
  if (!element) return;

  element.textContent = "";
  element.className = "form-message";
}

function readUsers() {
  const savedUsers = localStorage.getItem(USERS_KEY);
  if (!savedUsers) return [];

  const users = JSON.parse(savedUsers);
  return Array.isArray(users) ? users : [];
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

async function createPasswordHash(password, salt) {
  if (!window.crypto?.subtle) {
    throw new Error("Secure browser cryptography is unavailable.");
  }

  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const hash = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: hexToBytes(salt),
      iterations: PASSWORD_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    256
  );

  return bytesToHex(new Uint8Array(hash));
}

function hashesMatch(firstHash, secondHash) {
  if (firstHash.length !== secondHash.length) return false;

  let difference = 0;
  for (let index = 0; index < firstHash.length; index += 1) {
    difference |= firstHash.charCodeAt(index) ^ secondHash.charCodeAt(index);
  }

  return difference === 0;
}

function setButtonBusy(button, isBusy, busyText, defaultText) {
  button.disabled = isBusy;
  button.textContent = isBusy ? busyText : defaultText;
}

function setupSignupForm() {
  const signupForm = document.querySelector("#signup-form");
  if (!signupForm) return;

  const message = document.querySelector("#signup-message");
  const submitButton = signupForm.querySelector("button[type='submit']");

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage(message);

    const fullName = signupForm.elements.fullname.value.trim();
    const email = signupForm.elements.email.value.trim().toLowerCase();
    const password = signupForm.elements.password.value;
    const confirmedPassword = signupForm.elements["confirm-password"].value;

    if (fullName.length < 2) {
      showMessage(message, "Please enter your full name.");
      signupForm.elements.fullname.focus();
      return;
    }

    if (password.length < 8) {
      showMessage(message, "Your password must contain at least 8 characters.");
      signupForm.elements.password.focus();
      return;
    }

    if (password !== confirmedPassword) {
      showMessage(message, "The passwords do not match.");
      signupForm.elements["confirm-password"].focus();
      return;
    }

    try {
      const users = readUsers();
      const accountExists = users.some((user) => user.email === email);

      if (accountExists) {
        showMessage(message, "An account with this email already exists.");
        signupForm.elements.email.focus();
        return;
      }

      setButtonBusy(submitButton, true, "Creating account...", "Create account");

      const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
      const salt = bytesToHex(saltBytes);
      const passwordHash = await createPasswordHash(password, salt);

      users.push({
        fullName,
        email,
        salt,
        passwordHash,
        createdAt: new Date().toISOString(),
      });

      saveUsers(users);
      sessionStorage.setItem(PENDING_EMAIL_KEY, email);
      signupForm.reset();
      showMessage(message, "Account created. Taking you to sign in...", "success");

      window.setTimeout(() => {
        window.location.href = "index.html";
      }, 900);
    } catch (error) {
      console.error(error);
      showMessage(
        message,
        "Account creation is unavailable. Open the pages through localhost or VS Code Live Server and try again."
      );
      setButtonBusy(submitButton, false, "Creating account...", "Create account");
    }
  });
}

function setupLoginForm() {
  const loginForm = document.querySelector("#login-form");
  if (!loginForm) return;

  const message = document.querySelector("#login-message");
  const submitButton = loginForm.querySelector("button[type='submit']");
  const emailInput = loginForm.elements.email;
  const accountPanel = document.querySelector("#account-panel");
  const pageTitle = document.querySelector(".title");
  const socialMessage = document.querySelector(".social-message");
  const socialIcons = document.querySelector(".social-icons");
  const signupText = document.querySelector(".signup");

  function displayAccount(session) {
    loginForm.hidden = true;
    message.hidden = true;
    socialMessage.hidden = true;
    socialIcons.hidden = true;
    signupText.hidden = true;
    accountPanel.hidden = false;

    const firstName = session.fullName.split(/\s+/)[0];
    pageTitle.textContent = `Welcome, ${firstName}!`;
    document.querySelector("#account-name").textContent = session.fullName;
    document.querySelector("#account-email").textContent = session.email;
  }

  document.querySelector("#logout-button").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.reload();
  });

  try {
    const savedSession = sessionStorage.getItem(SESSION_KEY);
    if (savedSession) {
      displayAccount(JSON.parse(savedSession));
      return;
    }

    const pendingEmail = sessionStorage.getItem(PENDING_EMAIL_KEY);
    if (pendingEmail) {
      emailInput.value = pendingEmail;
      sessionStorage.removeItem(PENDING_EMAIL_KEY);
      showMessage(message, "Your account was created. You can sign in now.", "success");
      loginForm.elements.password.focus();
    }
  } catch (error) {
    console.error(error);
    showMessage(message, "Browser storage is unavailable. Please enable it and refresh the page.");
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage(message);

    const email = emailInput.value.trim().toLowerCase();
    const password = loginForm.elements.password.value;

    try {
      const users = readUsers();
      const user = users.find((savedUser) => savedUser.email === email);

      if (!user) {
        showMessage(message, "No account was found for this email.");
        emailInput.focus();
        return;
      }

      setButtonBusy(submitButton, true, "Signing in...", "Sign in");
      const attemptedHash = await createPasswordHash(password, user.salt);

      if (!hashesMatch(attemptedHash, user.passwordHash)) {
        showMessage(message, "The password you entered is incorrect.");
        loginForm.elements.password.select();
        setButtonBusy(submitButton, false, "Signing in...", "Sign in");
        return;
      }

      const session = { fullName: user.fullName, email: user.email };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      window.location.href = "http://localhost:5173/";
    } catch (error) {
      console.error(error);
      showMessage(
        message,
        "Sign-in is unavailable. Open the pages through localhost or VS Code Live Server and try again."
      );
      setButtonBusy(submitButton, false, "Signing in...", "Sign in");
    }
  });

  document.querySelector("#forgot-password").addEventListener("click", (event) => {
    event.preventDefault();
    showMessage(
      message,
      "Password recovery needs an email service and backend, so it is not available in this local demo.",
      "info"
    );
  });

  document.querySelectorAll(".social-icons .icon").forEach((button) => {
    button.addEventListener("click", () => {
      const provider = button.getAttribute("aria-label").replace("Log in with ", "");
      showMessage(message, `${provider} login requires OAuth configuration.`, "info");
    });
  });
}

setupSignupForm();
setupLoginForm();
