import Router from "next/router";
import { createContext, ReactNode, useEffect, useState } from "react";
import { setupApiClient } from "../services/api";

import { setCookie, parseCookies, destroyCookie } from 'nookies'
import { api } from "../services/apiClient";

export interface User {
    email: string;
    permissions: string[];
    roles: string[];
}

interface AuthContextData {
    signIn(email: string, password: string): Promise<void>; 
    isAuthenticated: boolean;
    user?: User;
};

export const AuthContext = createContext({} as AuthContextData);

let authChannel: BroadcastChannel;

export function signOut() {
    destroyCookie(undefined, 'nextauth.token');
    destroyCookie(undefined, 'nextauth.refreshToken');

    authChannel.postMessage('signOut');

    Router.push('/');
}

interface AuthProviderProps {
    children: ReactNode;
}
export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User>();
    const isAuthenticated = !!user;

    useEffect(() => {

        authChannel = new BroadcastChannel('auth');

        authChannel.onmessage = message => {
            switch(message.data) {
                case 'signOut':
                    signOut();
                    break;
                default:
                    break;
            }
        }

    }, [])

    useEffect(() => {
        
        const { 'nextauth.token': token } = parseCookies();

        if(token){
            api.get("/me")
                .then(response => {
                    setUser(response.data);
                }) 
        }
    }, [])
   

    async function signIn(email: string, password: string) {
        try {
            const response = await api.post("/sessions", { email, password })
            
            const { token, refreshToken, permissions, roles } = response.data;

            setUser({
                email,
                permissions,
                roles
            });

            setCookie(undefined, 'nextauth.token', token, {
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: '/' //quais endereços possui acesso a esse cookie('/' significa todos os endereços)
            }); 

            setCookie(undefined, 'nextauth.refreshToken', refreshToken,  {
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: '/' //quais endereços possui acesso a esse cookie('/' significa todos os endereços)
            });

           
            api.defaults.headers['Authorization'] = `Bearer ${token}`;
            
            // console.log("api login " + JSON.stringify(api.defaults.headers));

            Router.push("/dashboard");

        } catch(error) {
            signOut();
        }
    }

    return (
        <AuthContext.Provider value={{ signIn, isAuthenticated, user }}>
            { children }
        </AuthContext.Provider>
    )
}