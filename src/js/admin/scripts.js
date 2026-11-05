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
    clientwifiwipe:'Wipe client Wi-Fi'
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
 * Attach a click handler to the advanced-options toggle button.
 *
 * When clicked, reveals all elements with the CSS class 'isAdvanced' by
 * removing the 'hidden' class.  This is a one-way toggle — advanced options
 * are shown once clicked and cannot be re-hidden without a page reload.
 * Controls that are too dangerous or confusing for typical use are marked
 * 'isAdvanced' in the HTML so they stay hidden until explicitly requested.
 *
 * @param {string} id - The id prefix of the button element (e.g. 'advanced'
 *   maps to button id 'advanced-button').
 * @param {string} token - The auth token (unused here; kept for API symmetry).
 */
function attachAdvanced(id,token) {
    const button = document.getElementById(`${id}-button`)
	console.log(`attachSystemScript: ${id}-button`);
    button.addEventListener('click', () => {
   		openSnackBar('Enabling Advanced Options','success');
		console.log("Enabling Advanced Options -- show hidden regions");
		// Reveal all elements marked as advanced options.
		var elements = document.getElementsByClassName('isAdvanced')
		for (var element of elements) {
			console.log('Showing Advanced Option: ' + element.id)
			var item = document.getElementById(element.id)
			item.classList.remove('hidden');
		}
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
    //attachSystemScript('reset', token);
}