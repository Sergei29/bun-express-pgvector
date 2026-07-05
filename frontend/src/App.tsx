import Header from "@/components/Header";
import AskAIForm from "./components/AskAIForm";

function App() {
  return (
    <>
      <header>
        <Header />
      </header>
      <main className="min-h-screen p-4 max-w-7xl mx-auto ">
        <AskAIForm />
      </main>
    </>
  );
}

export default App;
