import "@fontsource/space-grotesk";
import "./globals.css";

export const metadata = {
  title: "WikiChat",
  description: "Chatting with WikiChat is a breeze! Simply type your questions or requests in a clear and concise manner. Responses are sourced from a real-time Wikipedia feed and a link for further reading is provided.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
