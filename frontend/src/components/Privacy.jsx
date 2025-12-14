import React, { useState, useEffect, useCallback } from 'react';
import '../styles/Privacy.css';

const Privacy = ({ onBack }) => {
  const [lastUpdated] = useState('June 27, 2025');
  const [activeSection, setActiveSection] = useState('');
  const [isScrolling, setIsScrolling] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  // Essential navigation items (reduced from 13 to 8)
  const navigationItems = [
    { id: 'overview', title: 'Privacy Overview', number: 1 },
    { id: 'information-collected', title: 'Information We Collect', number: 2 },
    { id: 'how-we-use', title: 'How We Use Your Data', number: 3 },
    { id: 'sharing-security', title: 'Sharing & Security', number: 4 },
    { id: 'your-rights', title: 'Your Privacy Rights', number: 5 },
    { id: 'data-retention', title: 'Data Retention & Children', number: 6 },
    { id: 'cookies-tracking', title: 'Cookies & Tracking', number: 7 },
    { id: 'contact-updates', title: 'Contact & Policy Updates', number: 8 }
  ];

  // Smooth scroll to section with active state tracking
  const scrollToSection = useCallback((sectionId) => {
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
  }, []);

  // Track active section and scroll progress
  useEffect(() => {
    const handleScroll = () => {
      if (isScrolling) return;

      const sections = document.querySelectorAll('.privacy-section');
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

  // Handle accept privacy policy with proper redirect
  const handleAcceptPrivacy = () => {
    // Store acceptance in localStorage
    localStorage.setItem('privacyAccepted', JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      version: lastUpdated
    }));
    
    // Show success message briefly
    const successMessage = document.createElement('div');
    successMessage.className = 'accept-success';
    successMessage.innerHTML = '<i class="fas fa-check-circle"></i> Privacy policy accepted successfully!';
    document.body.appendChild(successMessage);
    
    setTimeout(() => {
      document.body.removeChild(successMessage);
      
      // Navigate back to where user came from
      if (onBack) {
        onBack();
      } else if (document.referrer && !document.referrer.includes('/privacy')) {
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
    <div className="privacy-container">
      {/* Header Section */}
      <header className="privacy-header">
        <div className="header-content">
          <div className="brand-section">
            <div className="brand-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h1>Privacy Policy</h1>
            <p className="brand-tagline">Your Privacy, Our Priority</p>
          </div>
          
          <div className="header-info">
            <div className="last-updated">
              <i className="fas fa-calendar-alt"></i>
              <span><strong>Last updated:</strong> {lastUpdated}</span>
            </div>
            
            <div className="intro-text">
              <p>
                At <strong>QuizRipple</strong>, we believe privacy is a fundamental right. This policy 
                explains clearly and simply how we collect, use, and protect your personal information 
                when you use our quiz platform.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="privacy-content">
        {/* Table of Contents */}
        <aside className="table-of-contents">
          <div className="toc-header">
            <h3>
              <i className="fas fa-shield-alt"></i>
              Privacy Guide
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

        {/* Privacy Sections */}
        <article className="privacy-sections">
          {/* Section 1: Privacy Overview */}
          <section id="overview" className="privacy-section">
            <h2>
              <span className="section-icon">
                <i className="fas fa-eye"></i>
              </span>
              1. Privacy Overview
            </h2>
            <div className="section-content">
              <p>
                QuizRipple is committed to protecting your privacy. We only collect information 
                that helps us provide a better learning experience, and we never sell your personal data.
              </p>
              
              <div className="privacy-principles">
                <div className="principle-item">
                  <div className="principle-icon">
                    <i className="fas fa-eye"></i>
                  </div>
                  <div className="principle-text">
                    <h4>Transparency</h4>
                    <p>We tell you exactly what data we collect and why</p>
                  </div>
                </div>
                <div className="principle-item">
                  <div className="principle-icon">
                    <i className="fas fa-hand-paper"></i>
                  </div>
                  <div className="principle-text">
                    <h4>Control</h4>
                    <p>You decide what information to share and can change it anytime</p>
                  </div>
                </div>
                <div className="principle-item">
                  <div className="principle-icon">
                    <i className="fas fa-shield-alt"></i>
                  </div>
                  <div className="principle-text">
                    <h4>Security</h4>
                    <p>Your data is protected with industry-standard security measures</p>
                  </div>
                </div>
                <div className="principle-item">
                  <div className="principle-icon">
                    <i className="fas fa-minimize"></i>
                  </div>
                  <div className="principle-text">
                    <h4>Minimization</h4>
                    <p>We only collect data that's necessary for our services</p>
                  </div>
                </div>
              </div>

              <div className="highlight-box">
                <i className="fas fa-info-circle"></i>
                <p><strong>Simple Promise:</strong> We treat your data the way we'd want our own data treated - with respect and care.</p>
              </div>
            </div>
          </section>

          {/* Section 2: Information We Collect */}
          <section id="information-collected" className="privacy-section">
            <h2>
              <span className="section-icon">
                <i className="fas fa-database"></i>
              </span>
              2. What Information We Collect
            </h2>
            <div className="section-content">
              <h3>Information You Give Us</h3>
              <div className="data-categories">
                <div className="data-category">
                  <h4><i className="fas fa-user"></i> Account Information</h4>
                  <ul>
                    <li>Name and email address</li>
                    <li>Date of birth and gender (for age-appropriate content)</li>
                    <li>Mobile number (optional, for account security)</li>
                    <li>Profile picture (optional)</li>
                  </ul>
                </div>
                
                <div className="data-category">
                  <h4><i className="fas fa-brain"></i> Quiz Activity</h4>
                  <ul>
                    <li>Your quiz answers and scores</li>
                    <li>Time spent on quizzes and learning progress</li>
                    <li>Achievement badges and leaderboard rankings</li>
                    <li>Custom quizzes you create</li>
                  </ul>
                </div>
                
                <div className="data-category">
                  <h4><i className="fas fa-comments"></i> Communications</h4>
                  <ul>
                    <li>Messages you send to our support team</li>
                    <li>Feedback and comments you provide</li>
                    <li>Social interactions within the app</li>
                  </ul>
                </div>
              </div>

              <h3>Information We Automatically Collect</h3>
              <div className="auto-collect-grid">
                <div className="auto-collect-item">
                  <i className="fas fa-mobile-alt"></i>
                  <div>
                    <strong>Device Information</strong>
                    <p>Device type, operating system, and app version to ensure compatibility</p>
                  </div>
                </div>
                
                <div className="auto-collect-item">
                  <i className="fas fa-chart-line"></i>
                  <div>
                    <strong>Usage Analytics</strong>
                    <p>How you use the app to improve features and fix problems</p>
                  </div>
                </div>
                
                <div className="auto-collect-item">
                  <i className="fas fa-map-marker-alt"></i>
                  <div>
                    <strong>Location Data</strong>
                    <p>General location (city/country) for localized content and compliance</p>
                  </div>
                </div>
              </div>

              <h3>Information from Other Sources</h3>
              <p>
                If you sign up using Google or Facebook, we receive basic profile information 
                like your name and email. You control what information these services share with us.
              </p>
            </div>
          </section>

          {/* Section 3: How We Use Your Data */}
          <section id="how-we-use" className="privacy-section">
            <h2>
              <span className="section-icon">
                <i className="fas fa-cogs"></i>
              </span>
              3. How We Use Your Information
            </h2>
            <div className="section-content">
              <div className="usage-grid">
                <div className="usage-card">
                  <div className="usage-icon">
                    <i className="fas fa-play-circle"></i>
                  </div>
                  <h4>Provide Our Service</h4>
                  <ul>
                    <li>Create and manage your account</li>
                    <li>Deliver personalized quiz content</li>
                    <li>Track your learning progress</li>
                    <li>Calculate scores and maintain leaderboards</li>
                  </ul>
                </div>
                
                <div className="usage-card">
                  <div className="usage-icon">
                    <i className="fas fa-envelope"></i>
                  </div>
                  <h4>Communicate With You</h4>
                  <ul>
                    <li>Send account verification emails</li>
                    <li>Notify you of achievements and results</li>
                    <li>Provide customer support</li>
                    <li>Share important service updates</li>
                  </ul>
                </div>
                
                <div className="usage-card">
                  <div className="usage-icon">
                    <i className="fas fa-tools"></i>
                  </div>
                  <h4>Improve Our Service</h4>
                  <ul>
                    <li>Analyze how the app is used</li>
                    <li>Fix bugs and technical issues</li>
                    <li>Develop new features</li>
                    <li>Personalize your experience</li>
                  </ul>
                </div>
                
                <div className="usage-card">
                  <div className="usage-icon">
                    <i className="fas fa-shield-alt"></i>
                  </div>
                  <h4>Keep Everyone Safe</h4>
                  <ul>
                    <li>Prevent fraud and abuse</li>
                    <li>Enforce our community guidelines</li>
                    <li>Comply with legal requirements</li>
                    <li>Protect user safety and security</li>
                  </ul>
                </div>
              </div>

              <h3>Marketing Communications</h3>
              <p>
                We'll only send you promotional emails if you opt in. You can unsubscribe anytime 
                using the link in our emails or through your account settings.
              </p>
            </div>
          </section>

          {/* Section 4: Sharing & Security */}
          <section id="sharing-security" className="privacy-section">
            <h2>
              <span className="section-icon">
                <i className="fas fa-user-shield"></i>
              </span>
              4. Data Sharing & Security
            </h2>
            <div className="section-content">
              <div className="no-sell-banner">
                <i className="fas fa-ban"></i>
                <h3>We Never Sell Your Data</h3>
                <p>Your personal information is not for sale. We don't sell, rent, or trade your data to third parties for marketing purposes.</p>
              </div>

              <h3>When We Share Information</h3>
              <div className="sharing-scenarios">
                <div className="sharing-item">
                  <i className="fas fa-handshake"></i>
                  <div>
                    <strong>Trusted Service Providers</strong>
                    <p>We work with carefully vetted companies that help us run our service (like cloud storage and email delivery). They're contractually required to protect your data.</p>
                  </div>
                </div>
                
                <div className="sharing-item">
                  <i className="fas fa-balance-scale"></i>
                  <div>
                    <strong>Legal Requirements</strong>
                    <p>We may share data when required by law, to protect our users' safety, or to defend our rights.</p>
                  </div>
                </div>
                
                <div className="sharing-item">
                  <i className="fas fa-users"></i>
                  <div>
                    <strong>Public Features</strong>
                    <p>Information you choose to share publicly (like leaderboard scores) is visible to other users. You control these settings.</p>
                  </div>
                </div>
              </div>

              <h3>How We Protect Your Data</h3>
              <div className="security-measures">
                <div className="security-item">
                  <i className="fas fa-lock"></i>
                  <div>
                    <strong>Encryption</strong>
                    <p>All data is encrypted when transmitted and stored</p>
                  </div>
                </div>
                
                <div className="security-item">
                  <i className="fas fa-key"></i>
                  <div>
                    <strong>Access Controls</strong>
                    <p>Only authorized personnel can access your data</p>
                  </div>
                </div>
                
                <div className="security-item">
                  <i className="fas fa-search"></i>
                  <div>
                    <strong>Regular Audits</strong>
                    <p>We regularly test and improve our security systems</p>
                  </div>
                </div>
                
                <div className="security-item">
                  <i className="fas fa-eye"></i>
                  <div>
                    <strong>24/7 Monitoring</strong>
                    <p>We monitor for suspicious activity around the clock</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Your Privacy Rights */}
          <section id="your-rights" className="privacy-section">
            <h2>
              <span className="section-icon">
                <i className="fas fa-user-check"></i>
              </span>
              5. Your Privacy Rights & Control
            </h2>
            <div className="section-content">
              <p>
                You have full control over your personal information. Here's what you can do:
              </p>
              
              <div className="rights-grid">
                <div className="right-card">
                  <i className="fas fa-eye"></i>
                  <h4>Access Your Data</h4>
                  <p>Request a copy of all personal data we have about you</p>
                </div>
                
                <div className="right-card">
                  <i className="fas fa-edit"></i>
                  <h4>Update Information</h4>
                  <p>Correct any inaccurate information in your account</p>
                </div>
                
                <div className="right-card">
                  <i className="fas fa-trash-alt"></i>
                  <h4>Delete Your Data</h4>
                  <p>Request complete deletion of your account and data</p>
                </div>
                
                <div className="right-card">
                  <i className="fas fa-download"></i>
                  <h4>Export Your Data</h4>
                  <p>Download your data in a portable format</p>
                </div>
                
                <div className="right-card">
                  <i className="fas fa-pause"></i>
                  <h4>Restrict Processing</h4>
                  <p>Limit how we use your personal information</p>
                </div>
                
                <div className="right-card">
                  <i className="fas fa-times-circle"></i>
                  <h4>Object to Processing</h4>
                  <p>Object to certain uses of your data</p>
                </div>
              </div>

              <h3>How to Exercise Your Rights</h3>
              <div className="exercise-rights">
                <div className="method-item">
                  <i className="fas fa-cog"></i>
                  <div>
                    <strong>Account Settings</strong>
                    <p>Most controls are available directly in your account settings</p>
                  </div>
                </div>
                
                <div className="method-item">
                  <i className="fas fa-envelope"></i>
                  <div>
                    <strong>Email Us</strong>
                    <p>Contact privacy@QuizRipple.com for any privacy requests</p>
                  </div>
                </div>
                
                <div className="method-item">
                  <i className="fas fa-headset"></i>
                  <div>
                    <strong>Support Chat</strong>
                    <p>Use the in-app chat feature for immediate assistance</p>
                  </div>
                </div>
              </div>

              <div className="response-info">
                <i className="fas fa-clock"></i>
                <p><strong>Response Time:</strong> We'll respond to your privacy requests within 30 days.</p>
              </div>
            </div>
          </section>

          {/* Section 6: Data Retention & Children */}
          <section id="data-retention" className="privacy-section">
            <h2>
              <span className="section-icon">
                <i className="fas fa-calendar-times"></i>
              </span>
              6. Data Retention & Children's Privacy
            </h2>
            <div className="section-content">
              <h3>How Long We Keep Your Data</h3>
              <div className="retention-summary">
                <div className="retention-item">
                  <i className="fas fa-user"></i>
                  <div>
                    <strong>Account Information</strong>
                    <p>Until you delete your account</p>
                  </div>
                </div>
                
                <div className="retention-item">
                  <i className="fas fa-chart-bar"></i>
                  <div>
                    <strong>Quiz Performance</strong>
                    <p>3 years after your last activity</p>
                  </div>
                </div>
                
                <div className="retention-item">
                  <i className="fas fa-analytics"></i>
                  <div>
                    <strong>Usage Analytics</strong>
                    <p>2 years for service improvement</p>
                  </div>
                </div>
                
                <div className="retention-item">
                  <i className="fas fa-comments"></i>
                  <div>
                    <strong>Support Messages</strong>
                    <p>3 years for customer service</p>
                  </div>
                </div>
              </div>

              <p>
                We automatically delete data that's no longer needed. Some data may be kept longer 
                if required by law (like tax records).
              </p>

              <h3>Children's Privacy Protection</h3>
              <div className="children-protection">
                <div className="protection-card">
                  <i className="fas fa-child"></i>
                  <div>
                    <strong>Age Requirement</strong>
                    <p>Our service is for users 13 and older. For users under 18, we provide extra protections.</p>
                  </div>
                </div>
                
                <div className="protection-card">
                  <i className="fas fa-user-friends"></i>
                  <div>
                    <strong>Parental Controls</strong>
                    <p>Parents can request access to or deletion of their child's data by contacting us.</p>
                  </div>
                </div>
                
                <div className="protection-card">
                  <i className="fas fa-graduation-cap"></i>
                  <div>
                    <strong>Educational Use</strong>
                    <p>When used in schools, we work with educators to ensure appropriate protections.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 7: Cookies & Tracking */}
          <section id="cookies-tracking" className="privacy-section">
            <h2>
              <span className="section-icon">
                <i className="fas fa-cookie-bite"></i>
              </span>
              7. Cookies & Tracking
            </h2>
            <div className="section-content">
              <h3>What Are Cookies?</h3>
              <p>
                Cookies are small files stored on your device that help us remember your preferences 
                and provide a better experience. Think of them as a memory for our app.
              </p>

              <h3>Types of Cookies We Use</h3>
              <div className="cookie-types">
                <div className="cookie-type essential">
                  <div class="cookie-header">
                    <i className="fas fa-cog"></i>
                    <h4>Essential Cookies</h4>
                    <span className="cookie-status">Required</span>
                  </div>
                  <p>Keep you logged in and make the app work properly</p>
                </div>
                
                <div className="cookie-type functional">
                  <div class="cookie-header">
                    <i className="fas fa-user-cog"></i>
                    <h4>Preference Cookies</h4>
                    <span className="cookie-status">Optional</span>
                  </div>
                  <p>Remember your settings and preferences for a personalized experience</p>
                </div>
                
                <div className="cookie-type analytics">
                  <div class="cookie-header">
                    <i className="fas fa-chart-line"></i>
                    <h4>Analytics Cookies</h4>
                    <span className="cookie-status">Optional</span>
                  </div>
                  <p>Help us understand how you use the app to make improvements</p>
                </div>
              </div>

              <h3>Managing Your Cookie Preferences</h3>
              <div className="cookie-controls">
                <div className="control-item">
                  <i className="fas fa-sliders-h"></i>
                  <div>
                    <strong>In-App Settings</strong>
                    <p>Control cookie preferences in your account settings</p>
                  </div>
                </div>
                
                <div className="control-item">
                  <i className="fas fa-browser"></i>
                  <div>
                    <strong>Browser Settings</strong>
                    <p>Most browsers let you block or delete cookies</p>
                  </div>
                </div>
                
                <div className="control-item">
                  <i className="fas fa-ban"></i>
                  <div>
                    <strong>Opt-Out Tools</strong>
                    <p>Use opt-out tools for specific tracking services</p>
                  </div>
                </div>
              </div>

              <div className="cookie-note">
                <i className="fas fa-info-circle"></i>
                <p>Note: Blocking essential cookies may affect how the app works, but you'll still be able to use core features.</p>
              </div>
            </div>
          </section>

          {/* Section 8: Contact & Updates */}
          <section id="contact-updates" className="privacy-section">
            <h2>
              <span className="section-icon">
                <i className="fas fa-envelope-open-text"></i>
              </span>
              8. Contact Us & Policy Updates
            </h2>
            <div className="section-content">
              <h3>Privacy Team Contact</h3>
              <div className="contact-methods">
                <div className="contact-card">
                  <i className="fas fa-envelope"></i>
                  <h4>Email Support</h4>
                  <p><a href="mailto:privacy@QuizRipple.com">privacy@QuizRipple.com</a></p>
                  <span className="response-time">Response within 48 hours</span>
                </div>
                
                <div className="contact-card">
                  <i className="fas fa-comments"></i>
                  <h4>Live Chat</h4>
                  <p>Available in the app</p>
                  <span className="response-time">Monday-Friday, 9 AM - 6 PM EST</span>
                </div>
                
                <div className="contact-card">
                  <i className="fas fa-shield-alt"></i>
                  <h4>Data Protection Officer</h4>
                  <p><a href="mailto:dpo@QuizRipple.com">dpo@QuizRipple.com</a></p>
                  <span className="response-time">For formal privacy complaints</span>
                </div>
              </div>

              <h3>Policy Updates</h3>
              <div className="update-process">
                <div className="update-step">
                  <span className="step-number">1</span>
                  <div>
                    <strong>We'll Notify You</strong>
                    <p>Important changes will be communicated via email and in-app notifications</p>
                  </div>
                </div>
                
                <div className="update-step">
                  <span className="step-number">2</span>
                  <div>
                    <strong>Review Period</strong>
                    <p>You'll have 30 days to review any significant changes</p>
                  </div>
                </div>
                
                <div className="update-step">
                  <span className="step-number">3</span>
                  <div>
                    <strong>Your Choice</strong>
                    <p>Continued use means acceptance, or you can delete your account</p>
                  </div>
                </div>
              </div>

              <h3>Regulatory Authorities</h3>
              <p>
                If we can't resolve your privacy concerns, you can contact your local data protection 
                authority. We're happy to provide contact information if needed.
              </p>
            </div>
          </section>
        </article>
      </main>

      {/* Footer */}
      <footer className="privacy-footer">
        <div className="footer-content">
          <div className="footer-summary">
            <h3>Your Privacy Matters</h3>
            <p>
              By accepting this privacy policy, you're joining a community that values learning 
              and respects privacy. We're committed to protecting your data while providing 
              the best possible quiz experience.
            </p>
          </div>
          
          <div className="footer-actions">
            <button 
              className={`btn-accept ${!hasScrolledToBottom ? 'disabled' : ''}`}
              onClick={handleAcceptPrivacy}
              disabled={!hasScrolledToBottom}
            >
              <i className="fas fa-check"></i>
              I Understand & Accept
            </button>
            
            <div className="secondary-actions">
              <button 
                className="btn-secondary" 
                onClick={handlePrint}
              >
                <i className="fas fa-print"></i>
                Print Policy
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
              <span>Please scroll through the full policy to continue</span>
            </div>
          )}
          
          <div className="footer-meta">
            <p>
              <small>
                Policy Version: 2.0 | Effective: {lastUpdated} | 
                <a href="/terms">Terms of Service</a> | 
                <a href="/help">Help Center</a>
              </small>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Privacy;
