# Dict persistence round-trip

The runtime conformance harness loads
`conformance/packages/02_set_and_copy/`, saves it to a temporary directory,
reloads it, and compares project digests before and after the round trip.
