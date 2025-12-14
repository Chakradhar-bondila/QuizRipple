import React, { useState, useEffect } from 'react';
import '../styles/Terms.css';

const Terms = ({ onBack }) => {
  const [lastUpdated] = useState('June 27, 2025');
  const [activeSection, setActiveSection] = useState('');
  const [isScrolling, setIsScrolling] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  // Smooth scroll to section with active state tracking
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      setIsScrolling(true);
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
      setActiveSection(sectionId);
      
      setTimeout(() => setIsScrolling(false), 1000);
    }
  };

  // Track active section and scroll progress
  useEffect(() => {
    const handleScroll = () => {
      if (isScrolling) return;

      const sections = document.querySelectorAll('.terms-section');
      const scrollPosition = window.scrollY + 100;
      
      // Check if scrolled to bottom
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      if (windowHeight + scrollTop >= documentHeight - 100) {
        setHasScrolledToBottom(true);
      }

      sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
          setActiveSection(section.id);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isScrolling]);

  // Essential navigation items (reduced from 15 to 9)
  const navigationItems = [
    { id: 'acceptance', title: 'Acceptance of Terms', number: 1 },
    { id: 'user-accounts', title: 'User Accounts', number: 2 },
    { id: 'quiz-usage', title: 'Quiz Usage & Conduct', number: 3 },
    { id: 'prohibited-activities', title: 'Prohibited Activities', number: 4 },
    { id: 'intellectual-property', title: 'Intellectual Property', number: 5 },
    { id: 'privacy', title: 'Privacy & Data Protection', number: 6 },
    { id: 'disclaimers', title: 'Disclaimers & Warranties', number: 7 },
    { id: 'termination', title: 'Account Termination', number: 8 },
    { id: 'contact', title: 'Contact Information', number: 9 }
  ];

  // Handle accept terms action with proper redirect
  const handleAcceptTerms = () => {
    // Store acceptance in localStorage
    localStorage.setItem('termsAccepted', JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      version: lastUpdated
    }));
    
    // Show success message briefly
    const successMessage = document.createElement('div');
    successMessage.className = 'accept-success';
    successMessage.innerHTML = '<i class="fas fa-check-circle"></i> Terms accepted successfully!';
    document.body.appendChild(successMessage);
    
    setTimeout(() => {
      document.body.removeChild(successMessage);
      
      // Navigate back to where user came from
      if (onBack) {
        onBack();
      } else if (document.referrer && !document.referrer.includes('/terms')) {
        window.location.href = document.referrer;
      } else if (window.history.length > 1) {
        window.history.back();
      } else {
        // Fallback to dashboard or signin
        window.location.href = '/dashboard';
      }
    }, 1500);
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div className="terms-container">
      {/* Header Section */}
      <header className="terms-header">
        <div className="header-content">
          <div className="brand-section">
            <div className="brand-icon">
              <i className="fas fa-gavel"></i>
            </div>
            <h1>Terms & Conditions</h1>
            <p className="brand-tagline">Clear, Fair, and Transparent</p>
          </div>
          
          <div className="header-info">
            <div className="last-updated">
              <i className="fas fa-calendar-alt"></i>
              <span><strong>Last updated:</strong> {lastUpdated}</span>
            </div>
            
            <div className="intro-text">
              <p>
                Welcome to <strong>QuizRipple</strong>! These terms outline how you can use our 
                quiz platform safely and fairly. We've kept them clear and straightforward - 
                no confusing legal jargon.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="terms-content">
        {/* Table of Contents */}
        <aside className="table-of-contents">
          <div className="toc-header">
            <h3>
              <i className="fas fa-list"></i>
              Quick Navigation
            </h3>
          </div>
          
          <nav>
            <ul>
              {navigationItems.map((item) => (
                <li key={item.id}>
                  <button 
                    onClick={() => scrollToSection(item.id)}
                    className={activeSection === item.id ? 'active' : ''}
                  >
                    <span className="section-number">{item.number}</span>
                    <span className="section-title">{item.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="toc-actions">
            <button 
              onClick={scrollToTop}
              className="scroll-top-btn"
            >
              <i className="fas fa-arrow-up"></i>
              Back to Top
            </button>
          </div>
        </aside>

        {/* Terms Sections */}
        <article className="terms-sections">
          {/* Section 1: Acceptance of Terms */}
          <section id="acceptance" className="terms-section">
            <h2>
              <span className="section-icon">
                <i className="fas fa-handshake"></i>
              </span>
              1. Acceptance of Terms
            </h2>
            <div className="section-content">
              <p>
                By using QuizRipple, you agree to these terms. If you don't agree with any part, 
                please don't use our service. Your continued use means you accept any updates we make.
              </p>
              <div className="highlight-box">
                <i className="fas fa-info-circle"></i>
                <p><strong>Simple Agreement:</strong> Using our app = agreeing to these terms. No complex legal processes needed.</p>
              </div>
            </div>
          </section>

          {/* Section 2: User Accounts */}
          <section id="user-accounts" className="terms-section">
            <h2>
              <span className="section-icon">
                <i className="fas fa-user-circle"></i>
              </span>
              2. User Accounts
            </h2>
            <div className="section-content">
              <h3>Creating Your Account</h3>
              <p>
                To unlock personalized features, create an account with accurate information. 
                Keep your details up-to-date and your password secure.
              </p>
              
              <h3>Your Responsibilities</h3>
              <ul>
                <li><strong>Security:</strong> Use a strong, unique password and keep it private</li>
                <li><strong>Accuracy:</strong> Provide truthful information when signing up</li>
                <li><strong>Activity:</strong> You're responsible for everything done with your account</li>
                <li><strong>Age Requirement:</strong> Must be 13+ years old (parental consent required for 13-17)</li>
              </ul>
            </div>
          </section>

          {/* Section 3: Quiz Usage & Conduct */}
          <section id="quiz-usage" className="terms-section">
            <h2>
              <span className="section-icon">
                <i className="fas fa-brain"></i>
              </span>
              3. Quiz Usage & Fair Play
            </h2>
            <div className="section-content">
              <h3>How to Use Quizzes Properly</h3>
              <p>
                Our quizzes are designed to be educational and fun. Play fairly and honestly 
                to get the most out of your learning experience.
              </p>

              <div className="do-dont-grid">
                <div className="do-section">
                  <h4><i className="fas fa-check-circle"></i> Do</h4>
                  <ul>
                    <li>Answer based on your own knowledge</li>
                    <li>Respect time limits and quiz rules</li>
                    <li>Use quizzes for learning and improvement</li>
                    <li>Report any technical issues</li>
                  </ul>
                </div>
                
                <div className="dont-section">
                  <h4><i className="fas fa-times-circle"></i> Don't</h4>
                  <ul>
                    <li>Cheat or use external help (unless allowed)</li>
                    <li>Share quiz content during active sessions</li>
                    <li>Create multiple accounts for advantages</li>
                    <li>Use automated tools or bots</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Prohibited Activities */}
          <section id="prohibited-activities" className="terms-section">
            <h2>
              <span className="section-icon">
                <i className="fas fa-ban"></i>
              </span>
              4. What's Not Allowed
            </h2>
            <div className="section-content">
              <p>
                To keep QuizRipple safe and fair for everyone, certain activities are strictly prohibited:
              </p>
              
              <div className="prohibited-list">
                <div className="prohibited-item">
                  <i className="fas fa-exclamation-triangle"></i>
                  <div>
                    <strong>Hacking or System Abuse</strong>
                    <p>Don't try to break our security or interfere with our service</p>
                  </div>
                </div>
                
                <div className="prohibited-item">
                  <i className="fas fa-copy"></i>
                  <div>
                    <strong>Content Theft</strong>
                    <p>Don't copy, distribute, or steal our quiz content</p>
                  </div>
                </div>
                
                <div className="prohibited-item">
                  <i className="fas fa-mask"></i>
                  <div>
                    <strong>Impersonation</strong>
                    <p>Don't pretend to be someone else or provide fake information</p>
                  </div>
                </div>
                
                <div className="prohibited-item">
                  <i className="fas fa-bullhorn"></i>
                  <div>
                    <strong>Spam or Harassment</strong>
                    <p>Don't send unwanted messages or harass other users</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Intellectual Property */}
          <section id="intellectual-property" className="terms-section">
            <h2>
              <span className="section-icon">
                <i className="fas fa-copyright"></i>
              </span>
              5. Our Content Protection
            </h2>
            <div className="section-content">
              <p>
                All QuizRipple content (questions, explanations, designs, features) belongs to us. 
                You can use our app for personal learning, but you can't copy or redistribute our content.
              </p>
              
              <div className="license-info">
                <h4>What You Can Do</h4>
                <ul>
                  <li>Use our app for personal education and entertainment</li>
                  <li>Share your quiz results and achievements</li>
                  <li>Recommend QuizRipple to friends</li>
                </ul>
                
                <h4>What You Can't Do</h4>
                <ul>
                  <li>Copy our quiz questions for commercial use</li>
                  <li>Create competing apps using our content</li>
                  <li>Remove our branding or copyright notices</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 6: Privacy & Data Protection */}
          <section id="privacy" className="terms-section">
            <h2>
              <span className="section-icon">
                <i className="fas fa-shield-alt"></i>
              </span>
              6. Your Privacy & Data
            </h2>
            <div className="section-content">
              <p>
                We take your privacy seriously. Our Privacy Policy explains exactly what data we collect, 
                how we use it, and how we protect it.
              </p>
              
              <div className="privacy-summary">
                <div className="data-item">
                  <i className="fas fa-user"></i>
                  <div>
                    <strong>Account Info</strong>
                    <p>Name, email, and preferences you provide</p>
                  </div>
                </div>
                
                <div className="data-item">
                  <i className="fas fa-chart-line"></i>
                  <div>
                    <strong>Quiz Performance</strong>
                    <p>Your scores, progress, and learning analytics</p>
                  </div>
                </div>
                
                <div className="data-item">
                  <i className="fas fa-lock"></i>
                  <div>
                    <strong>Security</strong>
                    <p>We use encryption and security measures to protect your data</p>
                  </div>
                </div>
              </div>
              
              <p>
                <a href="/privacy" className="privacy-link">
                  <i className="fas fa-external-link-alt"></i>
                  Read our full Privacy Policy
                </a>
              </p>
            </div>
          </section>

          {/* Section 7: Disclaimers */}
          <section id="disclaimers" className="terms-section">
            <h2>
              <span className="section-icon">
                <i className="fas fa-info-circle"></i>
              </span>
              7. Important Disclaimers
            </h2>
            <div className="section-content">
              <p>
                QuizRipple is designed for education and entertainment. While we strive for accuracy, 
                please note these important points:
              </p>
              
              <div className="disclaimer-grid">
                <div className="disclaimer-card">
                  <i className="fas fa-graduation-cap"></i>
                  <h4>Educational Purpose</h4>
                  <p>Our quizzes are for learning and fun, not professional certification or formal assessment.</p>
                </div>
                
                <div className="disclaimer-card">
                  <i className="fas fa-wifi"></i>
                  <h4>Service Availability</h4>
                  <p>We aim for 99% uptime, but occasional maintenance or technical issues may occur.</p>
                </div>
                
                <div className="disclaimer-card">
                  <i className="fas fa-chart-bar"></i>
                  <h4>Results Accuracy</h4>
                  <p>While we ensure quality content, quiz results should be used as learning indicators, not absolute measures.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 8: Termination */}
          <section id="termination" className="terms-section">
            <h2>
              <span className="section-icon">
                <i className="fas fa-sign-out-alt"></i>
              </span>
              8. Account Termination
            </h2>
            <div className="section-content">
              <h3>Your Rights</h3>
              <p>
                You can delete your account anytime through your profile settings. 
                We'll remove your personal data according to our Privacy Policy.
              </p>
              
              <h3>Our Rights</h3>
              <p>
                We may suspend or terminate accounts that violate these terms, but we'll 
                always try to resolve issues through communication first.
              </p>
              
              <div className="termination-process">
                <div className="process-step">
                  <span className="step-number">1</span>
                  <div>
                    <strong>Warning</strong>
                    <p>First violation gets a friendly warning</p>
                  </div>
                </div>
                
                <div className="process-step">
                  <span className="step-number">2</span>
                  <div>
                    <strong>Temporary Suspension</strong>
                    <p>Repeated violations may result in temporary restrictions</p>
                  </div>
                </div>
                
                <div className="process-step">
                  <span className="step-number">3</span>
                  <div>
                    <strong>Account Termination</strong>
                    <p>Serious or repeated violations may lead to permanent removal</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 9: Contact Information */}
          <section id="contact" className="terms-section">
            <h2>
              <span className="section-icon">
                <i className="fas fa-headset"></i>
              </span>
              9. Need Help? Contact Us
            </h2>
            <div className="section-content">
              <p>
                Have questions about these terms or need support? We're here to help!
              </p>
              
              <div className="contact-methods">
                <div className="contact-card">
                  <i className="fas fa-envelope"></i>
                  <h4>Email Support</h4>
                  <p><a href="mailto:support@QuizRipple.com">support@QuizRipple.com</a></p>
                  <span className="response-time">Usually respond within 24 hours</span>
                </div>
                
                <div className="contact-card">
                  <i className="fas fa-comments"></i>
                  <h4>Live Chat</h4>
                  <p>Available in the app</p>
                  <span className="response-time">Monday-Friday, 9 AM - 6 PM EST</span>
                </div>
                
                <div className="contact-card">
                  <i className="fas fa-question-circle"></i>
                  <h4>Help Center</h4>
                  <p><a href="/help">Browse FAQs</a></p>
                  <span className="response-time">24/7 self-service support</span>
                </div>
              </div>
            </div>
          </section>
        </article>
      </main>

      {/* Footer */}
      <footer className="terms-footer">
        <div className="footer-content">
          <div className="footer-summary">
            <h3>Ready to Start Learning?</h3>
            <p>
              By accepting these terms, you're joining thousands of learners who trust QuizRipple 
              for their educational journey. We're committed to providing a safe, fair, and 
              engaging learning environment.
            </p>
          </div>
          
          <div className="footer-actions">
            <button 
              className={`btn-accept ${!hasScrolledToBottom ? 'disabled' : ''}`}
              onClick={handleAcceptTerms}
              disabled={!hasScrolledToBottom}
            >
              <i className="fas fa-check"></i>
              I Accept These Terms
            </button>
            
            <div className="secondary-actions">
              <button 
                className="btn-secondary" 
                onClick={handlePrint}
              >
                <i className="fas fa-print"></i>
                Print Terms
              </button>
              
              <button 
                className="btn-secondary" 
                onClick={onBack || (() => window.history.back())}
              >
                <i className="fas fa-arrow-left"></i>
                Go Back
              </button>
            </div>
          </div>
          
          {!hasScrolledToBottom && (
            <div className="scroll-notice">
              <i className="fas fa-scroll"></i>
              <span>Please scroll through all terms to continue</span>
            </div>
          )}
          
          <div className="footer-meta">
            <p>
              <small>
                Document Version: 3.0 | Effective: {lastUpdated} | 
                <a href="/privacy">Privacy Policy</a> | 
                <a href="/help">Help Center</a>
              </small>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Terms;
