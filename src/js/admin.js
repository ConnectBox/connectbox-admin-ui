/**
 * @fileoverview Admin dashboard entry point for connectbox-admin-ui.
 *
 * Bootstraps the admin page by:
 * 1. Registering Web Components (custom-accordion, custom-switch).
 * 2. Setting the page title from the device hostname.
 * 3. Wiring the logout button to clear the session and redirect.
 * 4. On window load: fetching current config values (load), attaching save
 *    callbacks to all form controls (attachUpdateCallbacks), initialising the
 *    reports section (initReports), and attaching system-action buttons
 *    (attachSystemScripts).
 * 5. Closing the popup modal when its backdrop is clicked.
 */

import './components/custom-accordion'
import './components/custom-switch'

import logout from "./admin/logout";
import {API_URL, get} from "./api/api";
import load from "./admin/load";
import attachUpdateCallbacks from "./admin/update";
import initReports from "./admin/reports";
import attachSystemScripts from "./admin/scripts";

// Auth token — currently unused (session-based auth via cookie replaces the
// token approach, but the token plumbing is kept in place for future use).
let token;

/**
 * Store a new auth token in memory.
 *
 * @param {string|null} nToken - New token value, or null to clear on logout.
 */
function setToken(nToken) {
    token = nToken
}

// Reflect the device hostname in the browser tab and page heading so the
// admin knows which device they're connected to when managing multiple boxes.
// Always ask for the password when Configuration is opened: only pages under
// /admin (the login page, or a reload of this page) lead straight here; from
// the main screen, a bookmark or an old footer link go to the login page.
const cameFrom = document.referrer || '';
if (cameFrom.indexOf(`${window.location.protocol}//${window.location.host}/admin`) !== 0) {
    window.location.replace('/admin/login.html');
    throw new Error('Login required');   // stop wiring up the admin page
}

const storedToken = localStorage.getItem('admin-authorization')

document.getElementById('title').innerText = `Admin: ${window.location.hostname}`;
document.title = `Admin: ${window.location.hostname}`;

// Wire logout button — clears token, removes stored credentials, calls the
// logout API endpoint, and redirects to the login page.
document.getElementById('logout').addEventListener('click', () => logout(setToken))

// The admin session ends when this page is left (Exit, Back, another link,
// closing the tab, reload), and is kept alive (once a minute) only while the
// page is open and on screen; connectbox-manage ends a session after 5 minutes
// without an admin request.  Reload, Back and Forward count as having left the
// page, so they go to the login page.
let navType = '';
try {
    const entry = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (entry) navType = entry.type;
    else if (performance.navigation) navType = ['navigate', 'reload', 'back_forward'][performance.navigation.type] || '';
} catch (e) {}
if (navType === 'reload' || navType === 'back_forward') {
    window.location.replace('/admin/login.html');
    throw new Error('Login required');
}
window.addEventListener('pageshow', (e) => {
    if (e.persisted) window.location.replace('/admin/login.html');
});

let sessionEnded = false;
function endSession() {
    if (sessionEnded) return;
    sessionEnded = true;
    try {
        if (navigator.sendBeacon && navigator.sendBeacon(`${API_URL}logout`)) return;
    } catch (e) {}
    try {
        const x = new XMLHttpRequest();
        x.open('get', `${API_URL}logout`, false);
        x.send();
    } catch (e) {}
}
if ('onpagehide' in window) window.addEventListener('pagehide', endSession);
else window.addEventListener('unload', endSession);

setInterval(() => {
    if (document.hidden) return;
    get(`${API_URL}keepalive`, '', () => {}, (code) => {
        if (code === 401) window.location.href = '/admin/login.html';
    });
}, 60000);

// Defer all data loading and callback wiring until after the DOM is fully
// parsed — ensures all input elements referenced by id exist before being
// queried by load() and attachUpdateCallbacks().
window.addEventListener('load', () => {
    load(token);
    attachUpdateCallbacks(token);
    initReports(token)
    attachSystemScripts(token);
})

// Close the popup modal when the user clicks its backdrop rather than the
// explicit close button — standard light-dismiss behaviour.
const popup = document.getElementById("popup");
popup.addEventListener('click', () => popup.style.display = 'none');

