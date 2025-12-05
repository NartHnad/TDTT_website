import { auth } from "./firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

export const loginEmail = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
};

export const registerEmail = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
};
