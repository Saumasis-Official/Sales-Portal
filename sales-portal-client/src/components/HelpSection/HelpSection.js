import React,{useState} from "react";
import '../HelpSection/index.css'
import FaqTab from "./Pages/FAQ";
import SopTab from "./Pages/SOP";

function HelpSection() {

  const [activeTab, setActiveTab] = useState("tab1");

//when FAQ tab is Active
  const handleTab1 = () => {
    setActiveTab("tab1");
  }

//when SOP tab is active
  const handleTab2 = () => {
    setActiveTab("tab2");
  }


  return (
    <div className="row">
      <ul className="nav">
        <li
          className={activeTab === "tab1" ? "active" : ""}
          onClick={handleTab1}
        >
          FAQ
        </li>
        <li
          className={activeTab === "tab2" ? "active" : ""}
          onClick={handleTab2}
        >
          SOP
        </li>
      </ul>
      <hr />
      <div className="outlet">
        {activeTab === "tab1" ? <FaqTab /> : <SopTab />}
      </div>
    </div>
  )
}

export default HelpSection;