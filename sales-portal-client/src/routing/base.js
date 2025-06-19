import { Route } from "react-router-dom"
import WelcomePage from '../services/auth/Welcome';

export default function Base(){
    return (
        <>
        <Route path='/'>
           
        
           <Route path="/" exact component={WelcomePage}  />
     
        </Route>
    
    
        </>
    )
    }