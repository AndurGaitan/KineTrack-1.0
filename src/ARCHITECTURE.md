# KineTrack - Architecture Documentation

## Overview

KineTrack is a clinical application for respiratory therapists in intensive care units. This document describes the architectural decisions, domain model, and best practices.

## Architecture Principles

### 1. Domain-Driven Design (DDD)
- **Domain Layer**: Pure business logic, framework-agnostic
- **Application Layer**: Use cases and application services
- **Infrastructure Layer**: External concerns (storage, API)
- **Presentation Layer**: React components and UI logic

### 2. Separation of Concerns
- **UI Components**: Only rendering and user interaction
- **Business Logic**: In domain services
- **Data Transformation**: In adapters
- **State Management**: In context/hooks

### 3. Preparation for Backend
- All IDs are strings (UUID-ready)
- Timestamps in ISO 8601 format
- Serializable data structures
- Clear boundaries between layers

## Directory Structure

```
src/
├── domain/                    # Domain layer (pure business logic)
│   ├── models.ts             # Core entities and value objects
│   ├── services/             # Domain services
│   │   ├── episodeService.ts
│   │   ├── observationService.ts
│   │   └── patientService.ts
│   └── adapters/             # Data transformation
│       └── observationAdapter.ts
│
├── contexts/                  # Application state
│   └── AppContext.tsx
│
├── hooks/                     # Custom React hooks
│   ├── usePatientEpisodes.ts
│   ├── usePatientManagement.ts
│   └── useLocalStorage.ts
│
├── components/                # UI components
│   ├── ui/                   # Reusable UI primitives
│   └── [feature components]
│
├── pages/                     # Page components
│
├── utils/                     # Utilities and helpers
│   ├── vmiCalculations.ts
│   ├── nivCalculations.ts
│   └── hfncCalculations.ts
│
└── types/                     # TypeScript type definitions
    └── index.ts
```

## Domain Model

### Core Entities

#### Patient
Represents a patient in the ICU.

```typescript
interface Patient {
  id: string;
  alias: string;
  sectorId: string;
  bed: number;
  supportType: SupportType; // Current active support
  status: PatientStatus;    // 'active' | 'closed'
  createdAt: string;
  episodes: SupportEpisode[];
  closure?: PatientClosure;
}
```

#### SupportEpisode
Represents a period with a specific respiratory support type.

**Clinical Context**: Patients transition through different support types as they improve or deteriorate (IMV → NIV → HFNC → Room Air). Each transition creates a new episode.

```typescript
interface SupportEpisode {
  id: string;
  supportType: SupportType;
  startAt: string;  // ISO 8601
  endAt?: string;   // null = active episode
  reason?: string;  // Clinical reason for change
}
```

**Invariants**:
- Only ONE active episode (endAt = null) per patient
- Episodes cannot overlap
- All observations must link to an episode

#### ClinicalObservation
Base interface for all monitoring records.

```typescript
interface ClinicalObservation {
  id: string;
  patientId: string;
  episodeId?: string;  // Links to support episode
  timestamp: string;   // ISO 8601
}
```

**Observation Types**:
- `IMVObservation`: Invasive mechanical ventilation
- `NIVObservation`: Non-invasive ventilation
- `HFNCObservation`: High-flow nasal cannula

### Key Design Decisions

#### 1. Measured vs Calculated Data

**Problem**: Should we store calculated values (Vt/kg, P/F ratio, ROX index)?

**Decision**: Store both, but clearly separate them.

**Rationale**:
- **Measured data** = source of truth (what was actually set/measured)
- **Calculated data** = derived values (can be recomputed)
- Storing calculated values improves query performance
- Clear separation allows recalculation if formulas change

```typescript
interface IMVObservation {
  // Measured (source of truth)
  tidalVolumeExpired: number;
  predictedBodyWeight: number;
  
  // Calculated (derived)
  calculated: {
    vtPerKg: number;  // = tidalVolumeExpired / predictedBodyWeight
  }
}
```

#### 2. Episode Linking

**Problem**: How to maintain traceability when support type changes?

**Decision**: All observations link to an episode via `episodeId`.

**Rationale**:
- Preserves complete clinical timeline
- Allows querying "all IMV observations" or "observations during episode X"
- Supports clinical questions like "how long was patient on NIV?"

#### 3. Patient Closure vs Deletion

**Problem**: What happens when a patient is discharged/transferred?

**Decision**: Close the case, don't delete.

**Rationale**:
- Clinical data must be preserved for legal/audit reasons
- Allows retrospective analysis
- Supports quality metrics (length of stay, outcomes)

```typescript
interface PatientClosure {
  reason: 'discharge' | 'transfer-ward' | 'transfer-facility' | 'deceased';
  date: string;
  notes?: string;
}
```

## Domain Services

### EpisodeService
Manages support episode lifecycle.

**Key Operations**:
- `createEpisode()`: Create new episode
- `closeEpisode()`: Close active episode
- `transitionSupport()`: Change support type (closes current, creates new)
- `calculateEpisodeDuration()`: Human-readable duration

### ObservationService
Manages clinical observations.

**Key Operations**:
- `getPatientObservations()`: All observations for a patient
- `getEpisodeObservations()`: Observations for specific episode
- `groupObservationsByEpisode()`: Group for timeline view
- `sortObservationsByDate()`: Sort chronologically

### PatientService
Manages patient lifecycle.

**Key Operations**:
- `createPatient()`: Create with initial episode
- `closePatientCase()`: Close case with reason
- `filterPatientsByStatus()`: Active vs closed
- `canEditPatient()`: Permission check

## Data Flow

### Creating a New Observation

```
User Input (UI)
    ↓
Form Validation (Component)
    ↓
Calculate Derived Values (utils/calculations)
    ↓
Create Observation (domain/services)
    ↓
Store via Context (contexts/AppContext)
    ↓
Persist to Storage (hooks/useLocalStorage)
```

### Changing Support Type

```
User Clicks "Change Support" (UI)
    ↓
Modal Collects: newSupport, reason, date
    ↓
transitionSupport() (domain/services/episodeService)
    ├─ Validate transition
    ├─ Close active episode
    └─ Create new episode
    ↓
Update Patient (contexts/AppContext)
    ↓
Persist (hooks/useLocalStorage)
```

## Migration Strategy

### Current State
- Legacy storage format (VMIRecord, NIVRecord, HFNCRecord)
- Direct context manipulation
- Mixed concerns in components

### Target State
- Domain models (IMVObservation, NIVObservation, HFNCObservation)
- Domain services for business logic
- Clean separation of concerns

### Adapter Pattern
We use adapters to bridge legacy and new models:

```typescript
// Read from storage (legacy format)
const vmiRecord: VMIRecord = getFromStorage();

// Convert to domain model
const observation: IMVObservation = vmiRecordToObservation(vmiRecord);

// Work with domain model
const filtered = getEpisodeObservations(observations, episodeId);

// Convert back to legacy format for storage
const recordToStore: VMIRecord = observationToVMIRecord(observation);
```

This allows gradual migration without breaking existing code.

## Best Practices

### 1. Component Responsibilities

**✅ DO**:
```typescript
// Component only handles UI and user interaction
function PatientDetail() {
  const { patient, episodes } = usePatientEpisodes(patientId);
  return <div>{/* Render */}</div>;
}
```

**❌ DON'T**:
```typescript
// Don't put business logic in components
function PatientDetail() {
  const calculateDuration = (start, end) => {
    // Complex calculation logic here
  };
}
```

### 2. Domain Services

**✅ DO**:
```typescript
// Pure functions, testable, reusable
export function calculateEpisodeDuration(startAt: string, endAt?: string) {
  // Logic here
}
```

**❌ DON'T**:
```typescript
// Don't couple to React or storage
export function calculateEpisodeDuration(patient: Patient) {
  const storage = localStorage.getItem('episodes'); // ❌
}
```

### 3. Type Safety

**✅ DO**:
```typescript
// Use discriminated unions
type ClinicalObservationType = 
  | IMVObservation 
  | NIVObservation 
  | HFNCObservation;

// Type guards
function isIMVObservation(obs: ClinicalObservationType): obs is IMVObservation {
  return obs.type === 'imv';
}
```

### 4. Error Handling

**✅ DO**:
```typescript
export function transitionSupport(patient: Patient, newSupport: SupportType) {
  const validation = validateSupportTransition(patient.supportType, newSupport);
  if (!validation.valid) {
    throw new Error(validation.warning);
  }
  // Continue...
}
```

## Future Backend Integration

### API Endpoints (Planned)

```
POST   /api/patients                    # Create patient
GET    /api/patients/:id                # Get patient
PATCH  /api/patients/:id                # Update patient
POST   /api/patients/:id/close          # Close patient case

POST   /api/patients/:id/episodes       # Create episode
GET    /api/patients/:id/episodes       # List episodes

POST   /api/observations                # Create observation
GET    /api/observations?patientId=X    # List observations
GET    /api/observations?episodeId=X    # List by episode
```

### Data Serialization

All domain models are designed to serialize cleanly to JSON:

```typescript
// Domain model
const observation: IMVObservation = { /* ... */ };

// Serialize for API
const json = JSON.stringify(observation);

// Deserialize from API
const restored: IMVObservation = JSON.parse(json);
```

### Migration Path

1. **Phase 1** (Current): Local storage with adapters
2. **Phase 2**: Add API client layer
3. **Phase 3**: Replace localStorage with API calls
4. **Phase 4**: Remove adapters, use domain models directly

## Testing Strategy

### Unit Tests (Domain Services)
```typescript
describe('episodeService', () => {
  it('should create episode with correct structure', () => {
    const episode = createEpisode('imv', '2024-01-01T00:00:00Z');
    expect(episode.supportType).toBe('imv');
    expect(episode.endAt).toBeUndefined();
  });
});
```

### Integration Tests (Hooks)
```typescript
describe('usePatientEpisodes', () => {
  it('should group observations by episode', () => {
    const { episodesWithObservations } = usePatientEpisodes('patient-1');
    expect(episodesWithObservations).toHaveLength(2);
  });
});
```

## Performance Considerations

### Memoization
Use `useMemo` for expensive computations:

```typescript
const episodesWithDurations = useMemo(() => {
  return episodes.map(ep => ({
    episode: ep,
    duration: calculateEpisodeDuration(ep.startAt, ep.endAt)
  }));
}, [episodes]);
```

### Lazy Loading
Load observations only when needed:

```typescript
const { observations } = usePatientEpisodes(patientId);
// Only fetched when component mounts
```

## Conclusion

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Testable business logic
- ✅ Type safety
- ✅ Scalability
- ✅ Backend-ready structure
- ✅ Maintainability

The domain-driven approach ensures that clinical logic is explicit, validated, and easy to reason about.
