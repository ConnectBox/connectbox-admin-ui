/**
 * @fileoverview Show the cloud server items only when the box can use them.
 *
 * In the Cloud Server Connection section, "Sync To Cloud Server"
 * (#cloudsyncregion), "Subscribe to Content Package" and "Download Missing
 * Content Files" (#cloudpackageregion) are shown when the box has a Box ID
 * and a Cloud Server URL is saved (Kirk, 2026-10-29).  Only the SAVED URL
 * counts: a URL typed but not yet saved does not.
 */

// The Box ID as the box reports it (its MAC address, e.g. 48-22-9b-0b-fd-f3);
// anything else (an error message, nothing) means the box has none.
let boxId = '';
const BOX_ID = /^[0-9a-f]{2}([-:][0-9a-f]{2}){5}$/i;

/**
 * Record the Box ID shown on the page and update the cloud items.
 * @param {string} value the Box ID from the box
 */
export function noteBoxId(value) {
    boxId = String(value || '').trim();
    updateCloudPackageVisibility();
}

/**
 * Record the saved value of the Cloud Server URL input and update the cloud items.
 * @param {HTMLElement} input the server_url-input element
 * @param {string} value the value now saved on the box
 */
export function noteSavedCloudValue(input, value) {
    if (input) input.dataset.saved = (value || '').trim();
    updateCloudPackageVisibility();
}

function show(id, yes) {
    const region = document.getElementById(id);
    if (!region) return;
    if (yes) region.classList.remove('hidden');
    else region.classList.add('hidden');
}

/** Show or hide the cloud items from the Box ID and the saved Cloud Server URL. */
export function updateCloudPackageVisibility() {
    const el = document.getElementById('server_url-input');
    const url = !!(el && el.dataset && el.dataset.saved);
    const ready = url && BOX_ID.test(boxId);
    show('cloudsyncregion', ready);
    show('cloudpackageregion', ready);
}
