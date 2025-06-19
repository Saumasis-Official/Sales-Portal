import { useMemo } from 'react';
import { Auth } from "aws-amplify";
export default ({ provider, options }) => {

  const auth = useMemo(() => {
    Auth.configure(options);
    return Auth;
  }, []);

  const signIn = () => auth.federatedSignIn({ provider });

  const signOut = () => auth.signOut();

  return {
    signIn,
    signOut,
  };
};