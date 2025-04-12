import { apiClient } from "./eden-client";


export async function login(username: string, password: string) {
    const { data } = await apiClient.api.users.login.post({
        login: username,
        password
    });

    return data ? data.user : null;
}

export async function getCurrentUser() {
    const res = await apiClient.api.users.me.get();
    return res.data ? res.data : null;
}

export async function logout() {
    const res = await apiClient.api.users.logout.post();
    return res.data;
}