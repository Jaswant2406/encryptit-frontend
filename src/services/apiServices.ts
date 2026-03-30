const API = import.meta.env.VITE_API_URL;

// Signup
export const signup = async (data: any) => {
  const res = await fetch(`${API}/api/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  return res.json();
};

// Login
export const login = async (data: any) => {
  const res = await fetch(`${API}/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  return res.json();
};