import axios, { AxiosError } from "axios";
import { setCookie, parseCookies } from "nookies";
import { AuthTokenError } from "../../errors/AuthTokenError";
import { signOut } from "../contexts/AuthContext";


let isRefreshing = false;

interface FailedRequest {
    retry: (token: string) => void;
    onFailure: (error: AxiosError) => void;
};
let faildRequestsQueue: FailedRequest[] = [];

export function setupApiClient(context = undefined) {

    let cookies = parseCookies(context);

    const api = axios.create({
        baseURL: 'http://localhost:3333',
        headers: {
            Authorization: `Bearer ${cookies['nextauth.token']}`
        }
    });
    
    
    api.interceptors.response.use(response => {
        return response;
    }, (error: AxiosError) => {
        
        if(error.response?.status === 401) {
            if(error.response.data.code === 'token.expired') {
    
                cookies = parseCookies(context);
    
                const { 'nextauth.refreshToken': refreshToken } = cookies;
                const originalConfig = error.config;
    
                if(!isRefreshing) { //para realizar o refreshing apenas uma vez
    
                    isRefreshing = true;
    
                    api.post('/refresh', {
                        refreshToken
                    }).then(response => {
        
                        const data = response.data;
                        
                        const newToken = data.token;
                        const newRefreshToken = data.refreshToken;
        
                        setCookie(context, 'nextauth.token', newToken, {
                            maxAge: 60 * 60 * 24 * 30, // 30 days
                            path: '/' 
                        }); 
            
                        setCookie(context, 'nextauth.refreshToken', newRefreshToken,  {
                            maxAge: 60 * 60 * 24 * 30, // 30 days
                            path: '/' 
                        });
        
                        api.defaults.headers['Authorization'] = `Bearer ${newToken}`;
    
                        faildRequestsQueue.forEach(request => request.retry(newToken));
                        faildRequestsQueue = [];
            
                    })
                    .catch(error => {
                        faildRequestsQueue.forEach(request => request.onFailure(error));
                        faildRequestsQueue = [];
    
                        if(process.browser){
                            signOut();
                        }
                    })
                    .finally(() => {
                        isRefreshing = false;
                    });
                }
    
                //enfileira requisições que falharam
                //retornando uma Promise dentro do interceptor, o axios aguarda a Promise finalizar
                return new Promise((resolve, reject) => {
    
                    faildRequestsQueue.push({
                        retry: (token: string) => {
                            originalConfig.headers['Authorization'] = `Bearer ${token}`;
                            resolve(api(originalConfig));
                        },
    
                        onFailure: (error: AxiosError) => {
                            reject(error);
                        }
                    });
    
                });
    
            } else {
                if(process.browser){
                    signOut();
                } else {
                    return Promise.reject(new AuthTokenError())
                }
            }
        }
    
        return Promise.reject(error);
        
    });

    return api;
}