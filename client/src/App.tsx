import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Tienda from "./pages/Tienda";
import Captura from "./pages/Captura";
import Analisis from "./pages/Analisis";
import Limpieza from "./pages/Limpieza";
import Diseno from "./pages/Diseno";
import Cotizador from "./pages/Cotizador";
import Visualizacion from "./pages/Visualizacion";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tienda" component={Tienda} />
      <Route path="/captura" component={Captura} />
      <Route path="/analisis" component={Analisis} />
      <Route path="/limpieza" component={Limpieza} />
      <Route path="/diseno" component={Diseno} />
      <Route path="/cotizador" component={Cotizador} />
      <Route path="/visualizacion" component={Visualizacion} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
