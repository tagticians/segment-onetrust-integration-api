// Configuration variables
const OPT_IN = true; // Set default for Segment.io Destination
const WEBSITE_WRITE_KEY = "sWc0wPbdtdU9QRRvJrNlow8Hnp7wPXXx"; // Your segment website source write key

// Segment Analytics.js SDK without default .page and .load calls
!function(){var analytics=window.analytics=window.analytics||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","once","off","on","addSourceMiddleware","addIntegrationMiddleware","setAnonymousId","addDestinationMiddleware"];analytics.factory=function(e){return function(){var t=Array.prototype.slice.call(arguments);t.unshift(e);analytics.push(t);return analytics}};for(var e=0;e<analytics.methods.length;e++){var key=analytics.methods[e];analytics[key]=analytics.factory(key)}analytics.load=function(key,e){var t=document.createElement("script");t.type="text/javascript";t.async=!0;t.src="https://evs.sdns.prio4.com/yvbu21dbeC/go18rexsDtdqGBkYKzwMq.min.js";var n=document.getElementsByTagName("script")[0];n.parentNode.insertBefore(t,n);analytics._loadOptions=e};analytics._writeKey="Bj8l9tfy18TcGSOckGO9nm6RGkTWTWLB";analytics._cdn = "https://evs.sdns.prio4.com";analytics.SNIPPET_VERSION="4.15.3";
}}();

window.analytics.ready(() => {
    fetchDestinations(WEBSITE_WRITE_KEY).then(
        destinations => {
            // Grab OptanonConsent cookie value
            let cookie_OptanonConsent = decodeURIComponent(getCookie("OptanonConsent"));
            
            // Check for additional consent
            if (cookie_OptanonConsent.indexOf('&groups=') > -1) {
                cookie_OptanonConsent = cookie_OptanonConsent.split('&groups=')[1].split('&')[0];
            }
      
            // Build Integrations object
            const destinationPreferences = destinations
            .map(function(dest) {
                // Analytics consent C0002:1
                if (dest.category === 'Analytics') return { [dest.id]: cookie_OptanonConsent.indexOf('C0002:1') > -1 ? true : false };
                // Functional consent C0003:1
                if (dest.category === 'Personalization') return { [dest.id]: cookie_OptanonConsent.indexOf('C0003:1') > -1 ? true : false };
                 // Targeting consent C0004:1
                 if (dest.category === 'Advertising') return { [dest.id]: cookie_OptanonConsent.indexOf('C0004:1') > -1 ? true : false };
                // Social Media consent C0005:1
                if (dest.category === 'Social Media') return { [dest.id]: cookie_OptanonConsent.indexOf('C0005:1') > -1 ? true : false };
            })
            .reduce(
                (acc, val) => {
                return {
                    ...val,
                    ...acc
                };
                },
                { "Segment.io": OPT_IN }
            );

            // Register OneTrust Integration Plugin with .load call
            window.analytics.register({
                name: 'OneTrust Integration API',
                version: '0.1.0',
                type: 'enrichment',
                isLoaded: () => true,
                load: () => Promise.resolve(),
                // Add Integrations object to every Segment call, add more if needed
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
            })
              
            // Send Initial Pageview with .page call
            analytics.page();
        }
    );
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

// Helper function to get cookie value by name
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}
