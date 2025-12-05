import { useState } from "react";
import { loginEmail, registerEmail } from "./authService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleLogin = async () => {
    try {
      await loginEmail(email, password);
      setMsg("Đăng nhập thành công!");
    } catch (err) {
      setMsg("Lỗi: " + err.message);
    }
  };

  const handleRegister = async () => {
    try {
      await registerEmail(email, password);
      setMsg("Đăng ký thành công! Hãy đăng nhập.");
    } catch (err) {
      setMsg("Lỗi: " + err.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Đăng nhập Firebase</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      /><br/>

      <input
        type="password"
        placeholder="Mật khẩu"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      /><br/>

      <button onClick={handleLogin}>Đăng nhập</button>
      <button onClick={handleRegister}>Đăng ký</button>

      <p>{msg}</p>
    </div>
  );
}
