import { useContext, useEffect } from "react"
import { useCan } from "../hooks/useCan";
import { withSSRAuth } from "../utils/withSSRAuth";
import { AuthContext, signOut } from "../contexts/AuthContext"
import { setupApiClient } from "../services/api";
import { api } from "../services/apiClient";
import { Can } from "../components/Can";


export default function Dashboard() {

    const { user } = useContext(AuthContext);

    useEffect(() => {

        api.get("/me")
            .then(response => {
                console.log(response)
            })
            .catch(error => {
                signOut();
            });
    }, [])
    

    return (
       <>
            <h1>Dashboard: {user?.email}</h1>

            <button onClick={signOut}>Sign out</button>

            <Can permissions={['metrics.list']}>
                <div>Métricas</div> 
            </Can>
       </>
    )
}

export const getServerSideProps = withSSRAuth(async(context) => {

    const apiClient = setupApiClient(context);

    const response  = await apiClient.get("/me");

    return {
        props: {}
    }
})