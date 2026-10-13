/**
 * PayGate Popup Modal SDK (paygate.js)
 * Embeddable client-side script for Bangladeshi Merchant checkouts.
 * Usage:
 *   <script src="https://pay.example.com/paygate.js"></script>
 *   <script>
 *     PayGate.open({
 *       paymentId: 'pay_...',
 *       onSuccess: function(data) { console.log('Payment successful', data); },
 *       onClose: function() { console.log('Modal closed'); }
 *     });
 *   </script>
 */

(function (window, document) {
  'use strict';

  var PayGate = {
    version: '4.0.0',
    _overlay: null,
    _iframe: null,

    /**
     * Opens modal checkout for payment
     * @param {Object} options
     * @param {string} options.paymentId
     * @param {string} [options.payUrl]
     * @param {Function} [options.onSuccess]
     * @param {Function} [options.onClose]
     * @param {Function} [options.onError]
     */
    open: function (options) {
      if (!options || (!options.paymentId && !options.payUrl)) {
        console.error('[PayGate] Missing required paymentId or payUrl');
        return;
      }

      this.close();

      var paymentId = options.paymentId;
      var targetUrl = options.payUrl || (window.location.origin + '/pay/' + encodeURIComponent(paymentId) + '?modal=true');

      // 1. Create Modal Container
      var overlay = document.createElement('div');
      overlay.id = 'paygate-modal-overlay';
      overlay.setAttribute('style', [
        'position: fixed',
        'top: 0',
        'left: 0',
        'width: 100vw',
        'height: 100vh',
        'background-color: rgba(14, 14, 17, 0.72)',
        'backdrop-filter: blur(4px)',
        '-webkit-backdrop-filter: blur(4px)',
        'z-index: 999999',
        'display: flex',
        'align-items: center',
        'justify-content: center',
        'padding: 16px',
        'box-sizing: border-box',
        'opacity: 0',
        'transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      ].join('; '));

      // 2. Create Modal Card
      var card = document.createElement('div');
      card.setAttribute('style', [
        'width: 100%',
        'max-width: 440px',
        'max-height: 90vh',
        'height: 640px',
        'background-color: #FAFAF9',
        'border-radius: 20px',
        'overflow: hidden',
        'box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.35)',
        'position: relative',
        'transform: scale(0.96)',
        'transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      ].join('; '));

      // 3. Create IFrame
      var iframe = document.createElement('iframe');
      iframe.src = targetUrl;
      iframe.title = 'PayGate Checkout';
      iframe.setAttribute('style', [
        'width: 100%',
        'height: 100%',
        'border: none',
        'display: block',
      ].join('; '));

      card.appendChild(iframe);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      // Trigger animation
      requestAnimationFrame(function () {
        overlay.style.opacity = '1';
        card.style.transform = 'scale(1)';
      });

      this._overlay = overlay;
      this._iframe = iframe;

      // 4. Message Event Listener with strict Origin & Window Source Verification
      var self = this;
      var expectedOrigin = (new URL(targetUrl, window.location.href)).origin;

      var messageHandler = function (event) {
        // Enforce origin check to prevent postMessage spoofing attacks
        if (event.origin !== expectedOrigin) {
          return;
        }

        // Enforce that message originates specifically from the checkout iframe window
        if (self._iframe && event.source !== self._iframe.contentWindow) {
          return;
        }

        if (!event.data || typeof event.data !== 'object') return;

        if (event.data.type === 'paygate:paid') {
          if (typeof options.onSuccess === 'function') {
            options.onSuccess(event.data.payload);
          }
          setTimeout(function () {
            self.close();
          }, 1500);
        } else if (event.data.type === 'paygate:close' || event.data.type === 'paygate:cancel') {
          if (typeof options.onClose === 'function') {
            options.onClose();
          }
          self.close();
        } else if (event.data.type === 'paygate:error') {
          if (typeof options.onError === 'function') {
            options.onError(event.data.error);
          }
        }
      };

      window.addEventListener('message', messageHandler);
      this._messageHandler = messageHandler;

      // Close on backdrop click
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          if (typeof options.onClose === 'function') {
            options.onClose();
          }
          self.close();
        }
      });
    },

    close: function () {
      if (this._overlay && this._overlay.parentNode) {
        this._overlay.parentNode.removeChild(this._overlay);
      }
      if (this._messageHandler) {
        window.removeEventListener('message', this._messageHandler);
        this._messageHandler = null;
      }
      this._overlay = null;
      this._iframe = null;
    },
  };

  window.PayGate = PayGate;
})(window, document);
