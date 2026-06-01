/*
 * Project Tracker — Design System
 * Theme: Professional dark with warm accents
 * Palette: Slate neutrals + blue primary + semantic colors
 */

/* ── Color Palette ────────────────────────────────────────── */
export const colors = {
    // Backgrounds
    bg:              '#0b0f14',
    surface:         '#131920',
    surfaceHover:    '#1a2230',
    surfaceActive:   '#1e2838',
    surfaceRaised:   '#1c2535',

    // Primary — muted blue
    primary:         '#4a9eff',
    primaryHover:    '#6aaeff',
    primaryMuted:    'rgba(74,158,255,0.15)',

    // Semantic
    success:         '#2ea043',
    successBg:       'rgba(46,160,67,0.12)',
    successBorder:   'rgba(46,160,67,0.3)',
    warning:         '#d29922',
    warningBg:       'rgba(210,153,34,0.12)',
    warningBorder:   'rgba(210,153,34,0.3)',
    danger:          '#f85149',
    dangerBg:        'rgba(248,81,73,0.12)',
    dangerBorder:    'rgba(248,81,73,0.3)',
    info:            '#4a9eff',
    infoBg:          'rgba(74,158,255,0.12)',

    // Text — warm-tinted grays for readability
    textPrimary:     '#e6edf3',
    textSecondary:   '#8b949e',
    textMuted:       '#6e7681',
    textDisabled:    '#484f58',
    textOnPrimary:   '#ffffff',

    // Borders
    border:          '#253040',
    borderLight:     '#1a2433',
    borderFocus:     '#4a9eff',

    // Accent for highlights
    accent:          '#f0883e',
    accentMuted:     'rgba(240,136,62,0.15)',
};

/* ── Typography Scale ─────────────────────────────────────── */
export const type = {
    xs:       { fontSize: '10px', lineHeight: '14px' },
    sm:       { fontSize: '12px', lineHeight: '16px' },
    base:     { fontSize: '13px', lineHeight: '20px' },
    md:       { fontSize: '14px', lineHeight: '22px' },
    lg:       { fontSize: '16px', lineHeight: '24px' },
    xl:       { fontSize: '18px', lineHeight: '28px' },
    xxl:      { fontSize: '22px', lineHeight: '30px' },
    heading:  { fontSize: '16px', lineHeight: '24px', fontWeight: 600 },
    title:    { fontSize: '20px', lineHeight: '28px', fontWeight: 700 },
    mono:     { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
};

/* ── Shadow / Elevation Scale ─────────────────────────────── */
export const shadow = {
    sm:    '0 1px 3px rgba(0,0,0,0.4)',
    md:    '0 4px 12px rgba(0,0,0,0.5)',
    lg:    '0 8px 24px rgba(0,0,0,0.6)',
    xl:    '0 16px 48px rgba(0,0,0,0.7)',
    focus: '0 0 0 2px rgba(74,158,255,0.35)',
    glow:  '0 0 12px rgba(74,158,255,0.15)',
};

/* ── Layout Primitives ────────────────────────────────────── */
export const layout = {
    header: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 1000,
    },
    filterBar: {
        display: 'flex',
        gap: '12px',
        padding: '72px 24px 20px 24px',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        backgroundColor: colors.bg,
    },
};

/* ── Cards ────────────────────────────────────────────────── */
export const cards = {
    project: {
        backgroundColor: colors.surface,
        borderRadius: '10px',
        overflow: 'hidden',
        border: `1px solid ${colors.border}`,
        boxShadow: shadow.sm,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        cursor: 'default',
        position: 'relative',
    },
    projectHover: {
        transform: 'translateY(-3px)',
        borderColor: '#354a66',
    },
    imageContainer: {
        height: '180px',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: colors.surfaceActive,
    },
    image: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transition: 'transform 0.3s ease',
    },
    content: { padding: '14px 16px 16px' },
    title: {
        margin: '0 0 2px 0',
        fontWeight: 600,
        fontSize: '15px',
        lineHeight: '22px',
        color: colors.textPrimary,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
    },
    description: {
        color: colors.textSecondary,
        fontSize: '12px',
        lineHeight: '17px',
        marginBottom: '10px',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
    },
    tagContainer: {
        display: 'flex',
        gap: '5px',
        marginBottom: '8px',
        flexWrap: 'wrap',
    },
    tag: (bgColor) => ({
        backgroundColor: bgColor === colors.success ? colors.successBg
            : bgColor === colors.warning ? colors.warningBg
            : bgColor === colors.danger ? colors.dangerBg
            : bgColor === colors.primary ? colors.primaryMuted
            : colors.border,
        color: bgColor === colors.success ? colors.success
            : bgColor === colors.warning ? colors.warning
            : bgColor === colors.danger ? colors.danger
            : bgColor === colors.primary ? colors.primary
            : colors.textSecondary,
        fontSize: '10px',
        padding: '2px 7px',
        borderRadius: '4px',
        fontWeight: 500,
        lineHeight: '15px',
    }),
    tagMuted: {
        backgroundColor: colors.borderLight,
        color: colors.textMuted,
        fontSize: '10px',
        padding: '2px 7px',
        borderRadius: '4px',
        lineHeight: '15px',
    },
    budgetRow: {
        marginBottom: '10px',
        fontSize: '13px',
        color: colors.textPrimary,
        fontWeight: 600,
    },
    progressBar: {
        flex: 1,
        height: '5px',
        backgroundColor: colors.borderLight,
        borderRadius: '3px',
        overflow: 'hidden',
    },
    progressFill: (pct) => ({
        width: `${Math.min(100, Math.max(0, pct))}%`,
        height: '100%',
        borderRadius: '3px',
        backgroundColor: pct >= 80 ? colors.success : pct >= 40 ? colors.warning : colors.primary,
        transition: 'width 0.3s ease',
    }),
    section: {
        backgroundColor: colors.surface,
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        padding: '16px',
    },
};

/* ── Buttons ──────────────────────────────────────────────── */
export const buttons = {
    primary: {
        backgroundColor: colors.primary,
        color: colors.textOnPrimary,
        border: 'none',
        borderRadius: '6px',
        padding: '7px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontWeight: 600,
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease, transform 0.1s ease',
        lineHeight: '18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    },
    secondary: {
        backgroundColor: 'transparent',
        color: colors.textSecondary,
        border: `1px solid ${colors.border}`,
        borderRadius: '6px',
        padding: '7px 14px',
        fontSize: '13px',
        cursor: 'pointer',
        fontWeight: 500,
        transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
        lineHeight: '18px',
    },
    ghost: {
        backgroundColor: 'transparent',
        color: colors.textMuted,
        border: `1px solid ${colors.border}`,
        borderRadius: '6px',
        padding: '5px 10px',
        fontSize: '11px',
        cursor: 'pointer',
        fontWeight: 500,
        transition: 'background-color 0.15s ease, color 0.15s ease',
        lineHeight: '16px',
    },
};

/* ── Modal ────────────────────────────────────────────────── */
export const modal = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, backdropFilter: 'blur(4px)',
    },
    overlayDark: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 3000, backdropFilter: 'blur(6px)',
    },
    container: {
        backgroundColor: colors.surface,
        width: '580px',
        maxHeight: '90vh',
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: shadow.xl,
    },
    containerWide: {
        backgroundColor: colors.surface,
        width: '90%',
        maxWidth: '960px',
        maxHeight: '90vh',
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: shadow.xl,
    },
    header: {
        padding: '14px 18px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerHighlight: {
        padding: '14px 18px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surfaceHover,
    },
    headerTitle: {
        margin: 0,
        fontSize: '16px',
        fontWeight: 600,
        color: colors.textPrimary,
        lineHeight: '22px',
    },
    body: { padding: '18px', overflowY: 'auto' },
    bodyGrid: {
        padding: '18px',
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: '20px',
    },
    formGrid2: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '14px',
        marginBottom: '14px',
    },
    formGrid3: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '14px',
        marginBottom: '14px',
    },
    fieldGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    label: {
        fontSize: '11px',
        color: colors.textMuted,
        fontWeight: 500,
        lineHeight: '15px',
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
    },
    actions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '20px',
        paddingTop: '14px',
        borderTop: `1px solid ${colors.border}`,
    },
    closeButton: {
        background: 'none',
        border: 'none',
        color: colors.textMuted,
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'color 0.15s ease, background-color 0.15s ease',
    },
    input: {
        fontFamily: 'inherit',
        backgroundColor: colors.bg,
        color: colors.textPrimary,
        border: `1px solid ${colors.border}`,
        borderRadius: '6px',
        padding: '7px 10px',
        fontSize: '13px',
        lineHeight: '18px',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        outline: 'none',
    },
    textarea: {
        fontFamily: 'inherit',
        backgroundColor: colors.bg,
        color: colors.textPrimary,
        border: `1px solid ${colors.border}`,
        borderRadius: '6px',
        padding: '7px 10px',
        fontSize: '13px',
        lineHeight: '18px',
        resize: 'vertical',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        outline: 'none',
    },
    select: {
        fontFamily: 'inherit',
        backgroundColor: colors.bg,
        color: colors.textPrimary,
        border: `1px solid ${colors.border}`,
        borderRadius: '6px',
        padding: '7px 10px',
        fontSize: '13px',
        lineHeight: '18px',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        outline: 'none',
    },
    errorText: {
        color: colors.danger,
        fontSize: '11px',
        lineHeight: '15px',
        marginTop: '2px',
    },
};

/* ── Form Fields ──────────────────────────────────────────── */
export const form = {
    input: {
        fontFamily: 'inherit',
        backgroundColor: colors.bg,
        color: colors.textPrimary,
        border: `1px solid ${colors.border}`,
        borderRadius: '6px',
        padding: '7px 10px',
        fontSize: '13px',
        lineHeight: '18px',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        outline: 'none',
    },
    textarea: {
        fontFamily: 'inherit',
        backgroundColor: colors.bg,
        color: colors.textPrimary,
        border: `1px solid ${colors.border}`,
        borderRadius: '6px',
        padding: '7px 10px',
        fontSize: '13px',
        lineHeight: '18px',
        height: '72px',
        resize: 'vertical',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        outline: 'none',
    },
    select: {
        fontFamily: 'inherit',
        backgroundColor: colors.bg,
        color: colors.textPrimary,
        border: `1px solid ${colors.border}`,
        borderRadius: '6px',
        padding: '7px 10px',
        fontSize: '13px',
        lineHeight: '18px',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        cursor: 'pointer',
        outline: 'none',
    },
    searchWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    searchInput: {
        padding: '7px 8px 7px 30px',
        width: '100%',
        fontFamily: 'inherit',
        backgroundColor: colors.bg,
        color: colors.textPrimary,
        border: `1px solid ${colors.border}`,
        borderRadius: '6px',
        fontSize: '13px',
        lineHeight: '18px',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        outline: 'none',
    },
    uploadZone: {
        border: `2px dashed ${colors.border}`,
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        color: colors.textMuted,
        fontSize: '12px',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease',
    },
    errorText: {
        color: colors.danger,
        fontSize: '11px',
        lineHeight: '15px',
        marginTop: '3px',
    },
};

/* ── Misc ─────────────────────────────────────────────────── */
export const subCountyHeading = {
    margin: '0 0 10px 0',
    padding: '3px 0 3px 10px',
    color: colors.textPrimary,
    borderLeft: `3px solid ${colors.primary}`,
    fontSize: '15px',
    fontWeight: 600,
    lineHeight: '22px',
};

export const emptyState = {
    textAlign: 'center',
    padding: '60px 20px',
    color: colors.textSecondary,
    fontSize: '14px',
};

export const statusBadge = {
    success: { backgroundColor: colors.successBg, color: colors.success, border: `1px solid ${colors.successBorder}` },
    warning: { backgroundColor: colors.warningBg, color: colors.warning, border: `1px solid ${colors.warningBorder}` },
    danger:  { backgroundColor: colors.dangerBg,  color: colors.danger,  border: `1px solid ${colors.dangerBorder}` },
    info:    { backgroundColor: colors.infoBg,     color: colors.info },
    muted:   { backgroundColor: colors.borderLight, color: colors.textMuted },
};

export function getStatusColor(status) {
    switch (status) {
        case 'Completed': return colors.success;
        case 'Ongoing':   return colors.warning;
        case 'On Hold':   return colors.danger;
        default:          return colors.textMuted;
    }
}

export const tabBar = {
    display: 'flex',
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
    overflowX: 'auto',
};

export const tab = (isActive) => ({
    padding: '10px 14px',
    border: 'none',
    backgroundColor: isActive ? colors.bg : 'transparent',
    color: isActive ? colors.textPrimary : colors.textMuted,
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: isActive ? 600 : 500,
    lineHeight: '18px',
    borderBottom: isActive ? `2px solid ${colors.primary}` : '2px solid transparent',
    transition: 'color 0.15s ease, background-color 0.15s ease',
    whiteSpace: 'nowrap',
});

export const feedbackBanner = (type) => ({
    padding: '8px 18px',
    fontSize: '12px',
    lineHeight: '17px',
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    ...(type === 'error'
        ? { backgroundColor: colors.dangerBg, color: colors.danger }
        : { backgroundColor: colors.successBg, color: colors.success }),
});
