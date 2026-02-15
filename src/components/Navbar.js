import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import supabase from "../supabaseClient.js";

const toSlug = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/\s*&\s*/g, " and ") 
    .replace(/\s*\//g, " ") 
    .replace(/\s+/g, "-") 
    .replace(/-+/g, "-"); 

const HIRE_TITLES = [
  "Grocery Help",
  "Electrical Work",
  "Plumbing Help",
  "Air Conditioner Service and Gas Filling",
  "Carpenter Work",
  "Tutoring",
  "Bill Payment",
  "Laundry and Ironing",
];

export default function Navbar() {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [searchOptions, setSearchOptions] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data: servicesData, error: servicesError } = await supabase
          .from("services")
          .select("id, title, description, image_url")
          .order("id", { ascending: true });

        if (servicesError) {
          console.error("Error fetching services:", servicesError);
          return;
        }

        const { data: subcatData, error: subcatError } = await supabase
          .from("service_subcategory_fk")
          .select("service_id, name")
          .order("name", { ascending: true });

        if (subcatError) {
          console.error("Error fetching subcategories:", subcatError);
        }

        const subcatMap = {};
        (subcatData || []).forEach((subcat) => {
          if (!subcatMap[subcat.service_id]) {
            subcatMap[subcat.service_id] = [];
          }
          subcatMap[subcat.service_id].push(subcat.name);
        });

        const servicesWithSubcats = (servicesData || []).map((svc) => ({
          ...svc,
          subcategories: subcatMap[svc.id] || [],
        }));

        setServices(servicesWithSubcats);
      } catch (err) {
        console.error("Unexpected error fetching services:", err);
      } finally {
        setServicesLoading(false);
      }
    };

    fetchServices();
  }, []);

  useEffect(() => {
    if (!services || services.length === 0) {
      setSearchOptions([]);
      return;
    }

    const names = [];

    services.forEach((svc) => {

      if (svc.title) names.push(svc.title);

      if (svc.subcategories && Array.isArray(svc.subcategories)) {
        svc.subcategories.forEach((sub) => {
          if (sub && sub.trim()) names.push(sub.trim());
        });
      }
    });

    const unique = Array.from(new Set(names));
    setSearchOptions(unique);
  }, [services]);

  const hireServices = services.filter((svc) =>
    HIRE_TITLES.includes(svc.title)
  );

  const handleSearch = () => {
    if (searchTerm.trim() !== "") {
      const formatted = toSlug(searchTerm);
      navigate(`/service/${formatted}`);
      setSearchTerm("");
    }
  };

  const handleServiceClick = (serviceTitle) => {
    const formattedTitle = toSlug(serviceTitle);
    navigate(`/service/${formattedTitle}`);
  };

  const handleSuggestionClick = (service) => {
    const formatted = toSlug(service);
    navigate(`/service/${formatted}`);
    setSearchTerm("");
    setSuggestions([]);
  };

  return (
    <nav className="navbar">
      <div className="logo">JoblyNest</div>

      <div className="navbar-center">
        <input
          type="text"
          className="search-bar"
          placeholder="Search services..."
          value={searchTerm}
          onChange={(e) => {
            const value = e.target.value;
            setSearchTerm(value);

            if (value.trim() === "") {
              setSuggestions([]);
            } else {
              const filtered = searchOptions.filter((service) =>
                service.toLowerCase().includes(value.toLowerCase())
              );
              setSuggestions(filtered);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
        />
        {suggestions.length > 0 && (
          <ul className="suggestions-list">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ul className="nav-links">
        <li>
          <Link to="/">Home</Link>
        </li>

        <li className="dropdown">
          <span>Services</span>
          <div className="mega-menu">
            {hireServices.map((svc) => {
              const subs = svc.subcategories && Array.isArray(svc.subcategories)
                ? svc.subcategories
                : [];

              return (
                <div className="menu-column" key={svc.id}>
                  <h4 onClick={() => handleServiceClick(svc.title)}>
                    {svc.title}
                  </h4>
                  <ul>
                    {subs.map((sub, idx) => (
                      <li
                        key={idx}
                        onClick={() => handleServiceClick(sub)}
                      >
                        {sub}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            {servicesLoading && hireServices.length === 0 && (
              <p style={{ padding: "10px" }}>Loading services...</p>
            )}
          </div>
        </li>

        <li>
          <Link to="/auth-option">Login/Signup</Link>
        </li>

        {location.pathname !== "/about-us" && (
          <li>
            <Link to="/about-us">About Us</Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
