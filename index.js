// Configuration variables
let all_default = false; // Set default integration object value for All destinations when the API call fails
const OPT_IN = true; // Set default integration object value for Segment.io Destination
const WEBSITE_WRITE_KEY = "sWc0wPbdtdU9QRRvJrNlow8Hnp7wPXXx"; // Your segment website source write key
const INDOMAIN_INSTRUMENTATION_URL = "https://cdn.segment.com/analytics.js/v1/" + WEBSITE_WRITE_KEY + "/analytics.min.js"; // Update to your CNAME if using Indomain Instrumentation

// Segment Analytics.js SDK
!function(){var analytics=window.analytics=window.analytics||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","once","off","on","addSourceMiddleware","addIntegrationMiddleware","setAnonymousId","addDestinationMiddleware"];analytics.factory=function(e){return function(){var t=Array.prototype.slice.call(arguments);t.unshift(e);analytics.push(t);return analytics}};for(var e=0;e<analytics.methods.length;e++){var key=analytics.methods[e];analytics[key]=analytics.factory(key)}analytics.load=function(key,e){var t=document.createElement("script");t.type="text/javascript";t.async=!0;t.src=INDOMAIN_INSTRUMENTATION_URL;var n=document.getElementsByTagName("script")[0];n.parentNode.insertBefore(t,n);analytics._loadOptions=e};analytics._writeKey=WEBSITE_WRITE_KEY;;analytics.SNIPPET_VERSION="4.15.3";
analytics.load(WEBSITE_WRITE_KEY);
}}();

// Set default destinationPreferences value as failsafe
let destinationPreferences = {
    "Segment.io": OPT_IN,
    "All": all_default
};

// Add event listeners for OneTrust consent banner
const ONETRUST_BUTTONS = [document.getElementById("onetrust-accept-btn-handler"), document.getElementById("accept-recommended-btn-handler"), document.querySelector("button.save-preference-btn-handler")];
ONETRUST_BUTTONS.forEach(button => {
    if(button != null) {
        button.addEventListener('click', () => {
            registerAndCall();
        });
    }
});

// Prepare destinationPreferences when analytics.js is loaded
window.analytics.ready(() => {
    fetchDestinations(WEBSITE_WRITE_KEY);
});

// Build integrations object
fetchDestinations(WEBSITE_WRITE_KEY).then(
    destinations => {
        // No OneTrust Cookie Failsafe
        let consent_onetrust = "";

        // Grab OneTrust Cookie value
        let cookie_OptanonConsent = getCookie("OptanonConsent");
        if (typeof cookie_OptanonConsent != 'undefined') {
            cookie_OptanonConsent = decodeURIComponent(cookie_OptanonConsent);
            // Get 'groups' from OptanonConsent cookie
            if (cookie_OptanonConsent.indexOf('&groups=') > -1) {
                consent_onetrust = cookie_OptanonConsent.split('&groups=')[1].split('&')[0];
            }
        }
  
        // Build Integrations object by comparing OneTrust Cookie values to Destinations
        destinationPreferences = destinations
        .map(function(dest) {
            // Analytics consent C0002:1
            if (dest.category === 'Analytics') return { [dest.id]: consent_onetrust.indexOf('C0002:1') > -1 ? true : false };
            // Functional consent C0003:1
            if (dest.category === 'Personalization') return { [dest.id]: consent_onetrust.indexOf('C0003:1') > -1 ? true : false };
             // Targeting consent C0004:1
             if (dest.category === 'Advertising') return { [dest.id]: consent_onetrust.indexOf('C0004:1') > -1 ? true : false };
            // Social Media consent C0005:1
            if (dest.category === 'Social Media') return { [dest.id]: consent_onetrust.indexOf('C0005:1') > -1 ? true : false };
        })
        .reduce(
            (acc, val) => {
                return { ...val, ...acc };
            },
            { "Segment.io": OPT_IN }
        );

        // Register the plugin and call the pageview
        registerAndCall(destinationPreferences);
    }
).catch(() => {
    // On API error, still register the plugin and call the pageview with All destination set to default value
    registerAndCall(destinationPreferences);
});

// Helper function for Segment Proejct Destination API
async function fetchDestinations(write_key) {
    const res = await window.fetch(
        `https://cdn.segment.com/v1/projects/${write_key}/integrations`
    );
    
    if (!res.ok) {
        throw new Error(
        `Failed to fetch integrations for write key ${write_key}: HTTP ${
            res.status
        } ${res.statusText}`
        );
    }
    
    const destinations = await res.json();

    // Rename creationName to id to abstract the weird data model
    for (const destination of destinations) {
        destination.id = destination.creationName;
        delete destination.creationName;
    }

    return destinations;
}

function registerAndCall(destinationPreferences) {
    // Register OneTrust Integration Plugin with .load call
    window.analytics.register({
        name: 'OneTrust Integration API',
        version: '0.1.0',
        type: 'enrichment',
        isLoaded: () => true,
        load: () => Promise.resolve(),
        // Add integrations object to every Segment call, add more types of tracking calls if needed
        page: (ctx) => {
            ctx.updateEvent(ctx.event.integrations = destinationPreferences)
            return ctx
        },
        track: (ctx) => {
            ctx.updateEvent(ctx.event.integrations = destinationPreferences)
            return ctx
        },
        identify: (ctx) => {
            ctx.updateEvent(ctx.event.integrations = destinationPreferences)
            return ctx
        }
    });
      
    // Send Initial Pageview with .page call
    analytics.page();
}

// Helper function to get cookie value by name
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}
