/**
 * @fileoverview Login page entry point for the connectbox-admin-ui admin UI.
 *
 * Handles the login form submission: encodes the password as Basic auth,
 * sends a PUT to /admin/api/auth, and redirects to /admin on success.
 * On failure, displays an inline error message distinguishing between an
 * incorrect password (401) and a server connectivity problem.
 */

import {API_URL, get, put} from "./api/api";
import str2B64 from "./utils/utf8";

/**
 * Handle the login form submit event.
 *
 * Reads the password field, builds a Basic-auth token, and sends a PUT
 * to the auth endpoint.  On success the server sets a session cookie and
 * the browser is redirected to the admin dashboard.  On failure an error
 * message is shown inline without a page reload.
 *
 * @param {Event} e - The form submit event (preventDefault is called to
 *   stop the default browser form submission).
 */
function login(e) {
    e.preventDefault()
    const password = document.getElementById('password').value;
    const token = str2B64(`admin:${password}`);

    const successCallback = () => {
        window.location = '/admin';
    }
    const errorCallback = (status) => {
        const errorMessage = document.getElementById('message-error')
        if (status === 401) errorMessage.innerText = 'Invalid password'
        else errorMessage.innerText = 'Unable to Connect To Database'
    }

    put(`${API_URL}auth`,'',{password:password},successCallback,errorCallback)
}

// Opening the login page ends any earlier admin session (its cookie lasts
// 24 h), so Configuration always asks for the password.  A login submitted
// before that has finished waits for it.
let ready = false;
const setReady = () => { ready = true; };
get(`${API_URL}logout`, '', setReady, setReady);
setTimeout(setReady, 3000);

function loginWhenReady(e) {
    e.preventDefault();
    if (ready) login(e);
    else setTimeout(() => loginWhenReady(e), 200);
}

document.getElementById('loginForm').addEventListener('submit', loginWhenReady);
