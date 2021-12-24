import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { destroyCookie, parseCookies } from "nookies";
import { AuthTokenError } from "../../errors/AuthTokenError";
import decode from 'jwt-decode';
import { validateUserPermissions } from "./validateUserPermissions";
import { User } from "../contexts/AuthContext";

interface WithSSRAuthOptions {
    permissions?: string[];
    roles?: string[];
}
export function withSSRAuth<P>(fn: GetServerSideProps<P>, options?: WithSSRAuthOptions): GetServerSideProps {
    return async(context: GetServerSidePropsContext): Promise<GetServerSidePropsResult<P>> => {
        
        const cookies = parseCookies(context);
        const token = cookies['nextauth.token'];

        
    
        if(!token){
            return {
                redirect: {
                    destination: '/',
                    permanent: false
                }
            }
        } else {

            if(options) {
                const user = decode<User>(token);
            
                const { permissions, roles } = options;
                const hasPermission = validateUserPermissions({ user, permissions, roles });
                if(!hasPermission){
                    return {
                        redirect: {
                            destination: '/dashboard',
                            permanent: false
                        }
                    }
                }
    
            }
           
            try {
                return await fn(context);
            }catch(error){
                if(error instanceof AuthTokenError){
                    destroyCookie(context, 'nextauth.token');
                    destroyCookie(context, 'nextauth.refreshToken');
                    return {
                        redirect: {
                            destination: '/',
                            permanent: false
                        }
                    }
                }
            }
        }
        
    }
}