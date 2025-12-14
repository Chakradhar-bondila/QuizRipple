import React, { useEffect, useRef } from 'react';

export default function GoogleButton() {
  const googleBtn = useRef(null);

  useEffect(() => {
    if (window.google && googleBtn.current) {
      window.google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID",
        callback: response => {
          alert("Google Sign-In Token:\n" + response.credential);
        }
      });
      window.google.accounts.id.renderButton(googleBtn.current, {
        theme: "outline",
        size: "large",
        width: "100%"
      });
    }
  }, []);

  return <div ref={googleBtn} id="google-button" />;
}
