import { Button } from "./button";
import { useNavigate } from "react-router-dom";

const PageNavigation = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border py-4 px-6 flex justify-center gap-8 z-50 shadow-sm">
      <Button
        variant="outline"
        onClick={() => navigate(-1)}
        className="w-32 h-11"
      >
        Back
      </Button>
      <Button
        variant="default"
        onClick={() => navigate("/")}
        className="w-32 h-11"
      >
        Home
      </Button>
    </div>
  );
};

export default PageNavigation; 