import {API_URL, get} from "../api/api";
/**
 * Forget token, end the session on the box, then show the main ConnectBox
 * screen.  Leaves only after the logout request has finished (or 3 s), so
 * leaving the page cannot cancel it and leave the session open.
 * @param setToken
 */
export default function logout(setToken) {
    setToken(null);
    localStorage.removeItem('admin-authorization');
    let gone = false;
    const home = () => {
        if (!gone) { gone = true; window.location = "/"; }
    };
    get(`${API_URL}logout`, '', home, home);
    setTimeout(home, 3000);
}