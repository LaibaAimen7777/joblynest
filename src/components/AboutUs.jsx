import React from "react";
import "../styles/AboutUs.css";
import Navbar from "./Navbar";
import { motion } from "framer-motion";
import { BsPersonCheckFill } from "react-icons/bs";
import { MdPayment, MdRateReview } from "react-icons/md";
import Footer from "./Footer";
import { MdEmail } from "react-icons/md";

export default function AboutUs() {
  return (
    <div>
      <Navbar />
      <div className="about-page">
        <section className="hero">
          <img
            src="/images/about1.jpg"
            alt="JoblyNest Hero"
            className="hero-img"
          />
          <div className="hero-overlay">
            <h1>About JoblyNest</h1>
          </div>
        </section>

        {/* Main Section */}
        <motion.section
          className="about-main"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="about-text">
            <h2>Welcome to JoblyNest</h2>
            <p>
              At JoblyNest, we connect people who need help with daily tasks to
              those looking for flexible work opportunities. Whether it’s home
              cleaning, furniture assembly, event setup, or other odd jobs,
              JoblyNest makes it easier to find the right person for the job.
              Our mission is to create a trusted platform where job seekers and
              posters can collaborate, save time, and build strong connections.
            </p>
          </div>

          <div className="about-image">
            <img src="/images/about3.jpg" alt="About JoblyNest" />
          </div>
        </motion.section>

        {/* Vision Section */}
        <motion.section
          className="about-main"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="about-image">
            <img src="/images/about2.png" alt="Our Vision" />
          </div>

          <div className="about-text">
            <h2>Our Vision</h2>
            <p>
              JoblyNest envisions a world where finding help or offering your
              skills is simple, trusted, and rewarding. By bridging the gap
              between task posters and job seekers, we’re building a community
              that values collaboration, flexibility, and reliability.
            </p>
          </div>
        </motion.section>

        {/* Idea Section */}
        <motion.section
          className="idea-section"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="idea-container">
            <h2>The Idea Behind JoblyNest</h2>
            <p>
              JoblyNest was born out of a simple realization that students and
              young professionals often struggle to find flexible work, while
              many people around us constantly need help with daily tasks. We
              wanted to bridge this gap by creating a platform where job seekers
              could showcase their skills and task posters could find reliable
              help quickly. What started as a small idea to connect people has
              grown into a vision for building stronger communities, where every
              skill and every opportunity matters.
            </p>
          </div>
        </motion.section>
        {/* Trust Section */}
        <motion.section
          className="trust-section"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2>Your Trust, Our Priority</h2>
          <div className="trust-boxes">
            <div className="trust-box">
              <BsPersonCheckFill className="trust-icon" />
              <h3>Verified Users</h3>
              <p>
                Every user is verified to ensure authenticity and reliability.
              </p>
            </div>

            <div className="trust-box">
              <MdPayment className="trust-icon" />
              <h3>Secure Payments</h3>
              <p>
                Safe and transparent transactions protect job seekers and
                posters.
              </p>
            </div>
            <div className="trust-box">
              <MdRateReview className="trust-icon" />
              <h3>Ratings & Reviews</h3>
              <p>
                Completed tasks are rated, helping the community recognize
                trusted people.
              </p>
            </div>
          </div>
        </motion.section>
        {/* Contact Section */}
        <motion.section
          className="contact-section"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="contact-container">
            <div className="contact-text">
              <motion.h2
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                Get in Touch with Us
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                Have questions or want to collaborate with JoblyNest? We would
                love to hear from you. Reach us at:
              </motion.p>

              <motion.p
                className="email"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
              >
                <MdEmail className="email-icon" /> joblynest@gmail.com
              </motion.p>
            </div>

            <motion.div
              className="contact-image"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              viewport={{ once: true }}
            >
              <img src="/images/about4.jpg" alt="Contact JoblyNest" />
            </motion.div>
          </div>
        </motion.section>

        <Footer />
      </div>
    </div>
  );
}
