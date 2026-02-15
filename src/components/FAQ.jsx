import React, { useState } from "react";
import { faqs } from "../data/faq";
import {
  FiSearch,
  FiChevronDown,
  FiChevronUp,
  FiHelpCircle,
  FiMail,
  FiMessageSquare,
  FiExternalLink,
} from "react-icons/fi";

const FAQ = () => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(null);
  const [contactModal, setContactModal] = useState(false);
  const categories = [...new Set(faqs.map((faq) => faq.category))];
  const [selectedCategory, setSelectedCategory] = useState("All");
const [showCopiedModal, setShowCopiedModal] = useState(false);

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (index) => {
    setOpen(open === index ? null : index);
  };

  const copyToClipboard = (text) => {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      setShowCopiedModal(true);

      setTimeout(() => setShowCopiedModal(false), 1500);
    })
    .catch(() => {
      console.error("Copy failed");
    });
};

  

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <FiHelpCircle size={28} />
        </div>
        <h1 style={styles.title}>Frequently Asked Questions</h1>
        <p style={styles.subtitle}>
          Find quick answers to common questions about our services
        </p>
      </div>


      <div style={styles.filterSection}>
        <div style={styles.searchContainer}>
          <FiSearch style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search for questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.search}
          />
        </div>

        <div style={styles.categoryContainer}>
          <span style={styles.categoryLabel}>Filter by:</span>
          <div style={styles.categoryButtons}>
            <button
              style={{
                ...styles.categoryButton,
                ...(selectedCategory === "All"
                  ? styles.activeCategoryButton
                  : {}),
              }}
              onClick={() => setSelectedCategory("All")}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                style={{
                  ...styles.categoryButton,
                  ...(selectedCategory === category
                    ? styles.activeCategoryButton
                    : {}),
                }}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.resultsInfo}>
        <p style={styles.resultsText}>
          {filteredFaqs.length}{" "}
          {filteredFaqs.length === 1 ? "question" : "questions"} found
          {selectedCategory !== "All" && ` in ${selectedCategory}`}
        </p>
      </div>

 
      <div style={styles.faqList}>
        {filteredFaqs.length === 0 ? (
          <div style={styles.emptyState}>
            <FiSearch size={48} style={styles.emptyIcon} />
            <h3 style={styles.emptyTitle}>No questions found</h3>
            <p style={styles.emptyText}>
              Try searching with different keywords or browse all categories
            </p>
            <button
              style={styles.resetButton}
              onClick={() => {
                setSearch("");
                setSelectedCategory("All");
              }}
            >
              Reset filters
            </button>
          </div>
        ) : (
          filteredFaqs.map((faq, index) => (
            <div
              key={faq.id}
              style={{
                ...styles.faqItem,
                ...(open === index ? styles.activeFaqItem : {}),
              }}
            >
              <div style={styles.faqQuestion} onClick={() => toggleFAQ(index)}>
                <div style={styles.questionContent}>
                  <span style={styles.questionCategory}>{faq.category}</span>
                  <span style={styles.questionText}>{faq.question}</span>
                </div>
                <div style={styles.chevron}>
                  {open === index ? (
                    <FiChevronUp size={20} />
                  ) : (
                    <FiChevronDown size={20} />
                  )}
                </div>
              </div>

              <div
                style={{
                  ...styles.faqAnswer,
                  maxHeight: open === index ? "500px" : "0",
                  opacity: open === index ? 1 : 0,
                }}
              >
                <div style={styles.answerContent}>{faq.answer}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={styles.helpSection}>
        <h3 style={styles.helpTitle}>
          <FiMessageSquare style={{ marginRight: "10px" }} />
          Still have questions?
        </h3>
        <p style={styles.helpText}>
          Can't find what you're looking for? Our support team is here to help.
        </p>
        <button
          style={styles.contactButton}
          onClick={() => setContactModal(true)}
        >
          Contact Support
        </button>
      </div>

      {contactModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <FiMail size={24} style={{ marginRight: "10px" }} />
              <h3 style={styles.modalTitle}>Contact Support</h3>
            </div>

            <div style={styles.modalBody}>
              <p style={styles.modalText}>
                Please reach out to us via email for any questions or support
                needs:
              </p>

<div style={styles.emailContainer}>
  <div style={styles.emailDisplay}>
    <FiMail style={{ marginRight: "10px", color: "#666" }} />
    <span style={styles.emailText}>joblynest@gmail.com</span>
  </div>

  <div style={styles.copyWrap}>
    <button
      style={styles.copyButton}
      onClick={() => copyToClipboard("joblynest@gmail.com")}
    >
      Copy Email
    </button>

    {showCopiedModal && <span style={styles.copiedText}>Email copied</span>}
  </div>
</div>

            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.modalCloseButton}
                onClick={() => setContactModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    width: "90%",
    maxWidth: "800px",
    margin: "2rem auto",
    padding: "2rem",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    backgroundColor: "#fff",
    borderRadius: "24px",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
  },
  copyWrap: {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "6px",
},

copiedText: {
  fontSize: "13px",
  color: "#2ecc71",
  fontWeight: "500",
},

  header: {
    textAlign: "center",
    marginBottom: "2.5rem",
  },
  headerIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "60px",
    height: "60px",
    backgroundColor: "#f0f7ff",
    borderRadius: "50%",
    marginBottom: "1rem",
    color: "#0066ff",
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: "700",
    marginBottom: "0.75rem",
    color: "#1a1a1a",
    background: "linear-gradient(135deg, #0066ff 0%, #00ccff 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "1.1rem",
    color: "#666",
    maxWidth: "600px",
    margin: "0 auto",
    lineHeight: 1.6,
  },
  filterSection: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    marginBottom: "2rem",
  },
  searchContainer: {
    position: "relative",
    width: "90%",
  },
  searchIcon: {
    position: "absolute",
    left: "20px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#999",
    fontSize: "20px",
  },
  search: {
    width: "100%",
    padding: "18px 20px 18px 55px",
    fontSize: "16px",
    borderRadius: "14px",
    border: "2px solid #e6e6e6",
    backgroundColor: "#fafafa",
    transition: "all 0.3s ease",
    outline: "none",
    ":focus": {
      borderColor: "#0066ff",
      backgroundColor: "#fff",
      boxShadow: "0 0 0 4px rgba(0, 102, 255, 0.1)",
    },
  },
  categoryContainer: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "1rem",
  },
  categoryLabel: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#555",
    whiteSpace: "nowrap",
  },
  categoryButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  categoryButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    borderRadius: "20px",
    border: "2px solid #e6e6e6",
    backgroundColor: "#fff",
    color: "#666",
    cursor: "pointer",
    transition: "all 0.2s ease",
    outline: "none",
    ":hover": {
      borderColor: "#0066ff",
      color: "#0066ff",
    },
  },
  activeCategoryButton: {
    backgroundColor: "#0066ff",
    borderColor: "#0066ff",
    color: "#fff",
    fontWeight: "600",
  },
  resultsInfo: {
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: "2px solid #f0f0f0",
  },
  resultsText: {
    fontSize: "15px",
    color: "#888",
    fontWeight: "500",
  },
  faqList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    marginBottom: "3rem",
  },
  faqItem: {
    backgroundColor: "#fafafa",
    borderRadius: "16px",
    border: "2px solid #f0f0f0",
    overflow: "hidden",
    transition: "all 0.3s ease",
    ":hover": {
      borderColor: "#e0e0e0",
    },
  },
  activeFaqItem: {
    borderColor: "#0066ff",
    backgroundColor: "#f8fbff",
    boxShadow: "0 4px 20px rgba(0, 102, 255, 0.1)",
  },
  faqQuestion: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.5rem",
    cursor: "pointer",
    userSelect: "none",
  },
  questionContent: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    flex: 1,
  },
  questionCategory: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#0066ff",
    backgroundColor: "#e6f2ff",
    padding: "4px 12px",
    borderRadius: "12px",
    alignSelf: "flex-start",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  questionText: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1a1a1a",
    lineHeight: 1.4,
  },
  chevron: {
    color: "#999",
    marginLeft: "1rem",
    transition: "transform 0.3s ease",
  },
  faqAnswer: {
    overflow: "hidden",
    transition: "all 0.4s ease",
  },
  answerContent: {
    padding: "0 1.5rem 1.5rem 1.5rem",
    fontSize: "16px",
    lineHeight: 1.7,
    color: "#555",
  },
  emptyState: {
    textAlign: "center",
    padding: "4rem 2rem",
    backgroundColor: "#fafafa",
    borderRadius: "16px",
    border: "2px dashed #e0e0e0",
  },
  emptyIcon: {
    color: "#ccc",
    marginBottom: "1.5rem",
  },
  emptyTitle: {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#666",
    marginBottom: "0.75rem",
  },
  emptyText: {
    fontSize: "1rem",
    color: "#888",
    maxWidth: "400px",
    margin: "0 auto 1.5rem",
    lineHeight: 1.6,
  },
  resetButton: {
    padding: "12px 32px",
    fontSize: "15px",
    fontWeight: "600",
    backgroundColor: "#0066ff",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    ":hover": {
      backgroundColor: "#0052d4",
      transform: "translateY(-2px)",
      boxShadow: "0 4px 12px rgba(0, 102, 255, 0.3)",
    },
  },
  helpSection: {
    textAlign: "center",
    padding: "2.5rem",
    backgroundColor: "#f8fbff",
    borderRadius: "20px",
    border: "2px solid #e6f2ff",
  },
  helpTitle: {
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: "1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  helpText: {
    fontSize: "1.1rem",
    color: "#666",
    maxWidth: "500px",
    margin: "0 auto 2rem",
    lineHeight: 1.6,
  },
  contactButton: {
    padding: "16px 40px",
    fontSize: "16px",
    fontWeight: "600",
    backgroundColor: "#0066ff",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    ":hover": {
      backgroundColor: "#0052d4",
      transform: "translateY(-3px)",
      boxShadow: "0 8px 25px rgba(0, 102, 255, 0.3)",
    },
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "500px",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    animation: "modalSlideIn 0.3s ease-out",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    padding: "1.5rem",
    borderBottom: "1px solid #e6f2ff",
    backgroundColor: "#f8fbff",
    borderTopLeftRadius: "20px",
    borderTopRightRadius: "20px",
  },
  modalTitle: {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#1a1a1a",
    margin: 0,
    flex: 1,
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "2rem",
    color: "#666",
    cursor: "pointer",
    padding: "0",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "#f0f0f0",
      color: "#333",
    },
  },
  modalBody: {
    padding: "2rem",
  },
  modalText: {
    fontSize: "1rem",
    color: "#555",
    lineHeight: 1.6,
    marginBottom: "1.5rem",
  },
  emailContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f8f8",
    padding: "1rem",
    borderRadius: "12px",
    marginBottom: "2rem",
    border: "1px solid #e0e0e0",
  },
  emailDisplay: {
    display: "flex",
    alignItems: "center",
    fontSize: "1.1rem",
    fontWeight: "500",
    color: "#333",
  },
  emailText: {
    fontFamily: "'Courier New', monospace",
    fontSize: "1rem",
  },
  copyButton: {
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "500",
    backgroundColor: "#f0f7ff",
    color: "#0066ff",
    border: "2px solid #cce0ff",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "#e0f0ff",
    },
  },
  modalInstructions: {
    fontSize: "0.95rem",
    color: "#666",
    marginBottom: "1.5rem",
    textAlign: "center",
  },
  emailButton: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    backgroundColor: "#0066ff",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s ease",
    marginBottom: "2rem",
    ":hover": {
      backgroundColor: "#0052d4",
      transform: "translateY(-2px)",
      boxShadow: "0 8px 20px rgba(0, 102, 255, 0.3)",
    },
  },
  alternativeOptions: {
    backgroundColor: "#f9f9f9",
    padding: "1.5rem",
    borderRadius: "12px",
    border: "1px solid #e8e8e8",
  },
  alternativeTitle: {
    fontSize: "1rem",
    fontWeight: "600",
    color: "#444",
    marginBottom: "0.75rem",
  },
  alternativeList: {
    margin: 0,
    paddingLeft: "1.5rem",
    fontSize: "0.9rem",
    color: "#666",
    lineHeight: 1.8,
  },
  modalFooter: {
    padding: "1.5rem",
    borderTop: "1px solid #e6f2ff",
    display: "flex",
    justifyContent: "flex-end",
  },
  
  modalCloseButton: {
    padding: "10px 24px",
    fontSize: "15px",
    fontWeight: "500",
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    border: "2px solid #e2e8f0",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "#e2e8f0",
    },
    
  },
  

};

const ModalAnimation = () => (
  <style>{`
    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
      .copied-text {
  margin-left: 10px;
  font-size: 14px;
  color: #2ecc71;
  font-weight: 500;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
  

  `}</style>
);

export default FAQ;
