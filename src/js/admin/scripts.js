/**
 * @fileoverview System-action button wiring for the connectbox-admin-ui admin dashboard.
 *
 * Connects the system-action buttons (shutdown, reboot, sync, openwellusb, etc.)
 * to GET /admin/api/do/:command requests.  Each action is fire-and-forget: the
 * button triggers the command, a processing snackbar is shown, and a popup
 * confirms completion or failure.
 *
 * The messages map provides human-readable labels for each command so error
 * and success messages are consistent without duplicating strings.
 */

import {API_URL, get, post} from "../api/api";
import openSnackBar from "../components/snackbar";
import openPopup from "../components/popup";

/**
 * Messages to prefix success/error messages
 * @type {{reboot: string, unmountusb: string, reset: string, shutdown: string,courseusb: string, openwellusb: string}}
 */
const messages = {
	openwellusb:'Loading Content From USB',
	openwellrefresh:'Refreshing Missing Content For OpenWell',
    unmountusb:'Unmounting USB',
    shutdown:'System shutdown',
    reboot:'System reboot',
    reset:'System reset',
    sync:'Sync With Server',
    deleteweblog:'Delete Stats',
    clientwifiwipe:'Wipe client Wi-Fi',
    internetusagereset:'Reset data counter'
}

/**
 * Open a snackbar and display a success message
 * @param name the updated field
 */
function successCallback(id) {
    openPopup('Success', `${messages[id]} successfully initiated`, );
}

/**
 * Open a snackbar and display an error message
 * @param name the updated field
 */
function errorCallback(id, code) {
    if(code === 401) window.location.href = "/admin/login.html";
    openSnackBar(`${messages[id]} failed`, 'error');
}

/**
 * Connect a button with id ':id-button' to API call for system script
 * @param id the prefix of button id
 * @param token the token to authenticate the request
 */
function attachSystemScript(id, token) {
    const button = document.getElementById(`${id}-button`)
	console.log(`attachSystemScript: ${id}-button`);
    button.addEventListener('click', () => {
   		openSnackBar('Processing...','success');
        get(`${API_URL}do/${id}`,token,()=>successCallback(id), (code)=>errorCallback(id, code))
    })
}

/**
 * Connect the client Wi-Fi "wipe" button: asks first, then GET /admin/api/do/clientwifiwipe.
 * The box sets the client SSID and password back to the defaults, forgets the
 * remembered networks and restarts the client Wi-Fi.  The form fields are
 * cleared to the defaults so they match.
 * @param token the token to authenticate the request
 */
function attachClientWifiWipe(token) {
    const button = document.getElementById('clientwifiwipe-button');
    if (!button) return;
    button.addEventListener('click', () => {
        if (!window.confirm('Wipe the client Wi-Fi SSID and password, and forget all remembered networks? The box will disconnect from the internet Wi-Fi.')) return;
        openSnackBar('Processing...','success');
        get(`${API_URL}do/clientwifiwipe`, token, () => {
            const ssid = document.getElementById('client-ssid-input');
            const pass = document.getElementById('client-wifipassword-input');
            if (ssid) ssid.value = 'Default';
            if (pass) pass.value = 'Default1';
            openPopup('Success', 'Client Wi-Fi wiped');
        }, (code) => errorCallback('clientwifiwipe', code));
    });
}

/**
 * Bytes as text, in decimal units (1 MB = 1,000,000 bytes).
 * @param {number} b - bytes
 */
function formatBytes(b) {
    b = Number(b) || 0;
    if (b >= 1e9) return (b / 1e9).toFixed(2) + ' GB';
    if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB';
    if (b >= 1e3) return (b / 1e3).toFixed(1) + ' kB';
    return b + ' bytes';
}

/**
 * Show the internet sharing data total (GET internetusage: {up, down, since})
 * and connect its "Reset data counter" button (GET do/internetusagereset).
 * @param token the token to authenticate the requests
 */
function attachInternetUsage(token) {
    const text = document.getElementById('internet_usage-text');
    const button = document.getElementById('internetusagereset-button');
    if (!text) return;
    const show = () => get(`${API_URL}internetusage`, token, (result) => {
        const u = (result && result[0]) || {};
        const up = Number(u.up) || 0, down = Number(u.down) || 0;
        text.textContent = `Data shared: ${formatBytes(up + down)} (down ${formatBytes(down)}, up ${formatBytes(up)})` +
            (u.since ? ` since ${u.since}` : '');
    }, () => {});
    show();
    if (button) button.addEventListener('click', () => {
        if (!window.confirm('Set the shared data counter back to 0?')) return;
        get(`${API_URL}do/internetusagereset`, token, () => { show(); openSnackBar('Data counter reset', 'success'); },
            (code) => errorCallback('internetusagereset', code));
    });
}

/**
 * Attach a click handler to the advanced-options toggle button.
 *
 * Pressing it shows all elements with the CSS class 'isAdvanced' (removes
 * 'hidden'); pressing it again hides them.  The choice is remembered in this
 * browser (localStorage), so Advanced stays on after the next login until it
 * is pressed again (2026-11-05: every login reloads the page, which used to
 * hide them again).  Controls that are too dangerous or confusing for typical
 * use are marked 'isAdvanced' in the HTML.
 *
 * @param {string} id - The id prefix of the button element (e.g. 'advanced'
 *   maps to button id 'advanced-button').
 * @param {string} token - The auth token (unused here; kept for API symmetry).
 */
const ADVANCED_KEY = 'connectbox-admin-advanced';

function advancedRemembered() {
    try { return localStorage.getItem(ADVANCED_KEY) === '1'; } catch (e) { return false; }
}

function showAdvanced(on) {
    for (const element of document.getElementsByClassName('isAdvanced')) {
        if (on) element.classList.remove('hidden');
        else element.classList.add('hidden');
    }
}

function attachAdvanced(id,token) {
    const button = document.getElementById(`${id}-button`)
	console.log(`attachSystemScript: ${id}-button`);
    if (advancedRemembered()) showAdvanced(true);
    button.addEventListener('click', () => {
        const on = !advancedRemembered();
        try { localStorage.setItem(ADVANCED_KEY, on ? '1' : '0'); } catch (e) {}
        showAdvanced(on);
   		openSnackBar(on ? 'Enabling Advanced Options' : 'Advanced options hidden', 'success');
    })
}

/**
 * Attach all API to buttons of system section
 * @param token the token to authenticate the requests
 */
export default function attachSystemScripts(token){
    attachSystemScript('openwellusb', token);
    attachSystemScript('openwellrefresh', token);
    attachSystemScript('deleteweblog', token);
    attachSystemScript('shutdown', token);
    attachSystemScript('reboot', token);
    attachSystemScript('sync', token);
    attachAdvanced('advanced', token);
    attachClientWifiWipe(token);
    attachInternetUsage(token);
    //attachSystemScript('reset', token);
}